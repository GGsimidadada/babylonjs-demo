import {
    ArcRotateCamera,
    Color3,
    Engine,
    HemisphericLight,
    LinesMesh,
    Mesh,
    MeshBuilder,
    Scene,
    SceneLoader,
    Tools,
    Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

interface Point {
    x?: number;
    y?: number;
    z?: number;
}

class Viewer3d {
    public engine: Engine;
    public scene: Scene;
    public camera: ArcRotateCamera;
    public light: HemisphericLight;

    constructor(canvas: HTMLCanvasElement) {
        // 首先创建一个引擎
        const engine = new Engine(canvas);
        // 在引擎中创建一个场景
        const scene = new Scene(engine);
        // 设置一个旋转相机，旋转中心是世界坐标的原点
        const camera = new ArcRotateCamera('arc-rotate-camera', 0, 0, 0, Vector3.Zero(), scene);
        // 将相机移动到{ x: 0, y: 50, z: -50 }的位置
        camera.setPosition(new Vector3(0, 50, -50));
        // 将相机和canvas联系起来，可以用鼠标/键盘控制旋转或中心点
        camera.attachControl(true);
        // 创建一个半球光源，
        const light = new HemisphericLight('hemispheric-light', Vector3.Up(), scene);
        light.groundColor = Color3.White();
        // 必须执行，在每一帧中刷新场景
        engine.runRenderLoop(() => scene.render());
        this.engine = engine;
        this.scene = scene;
        this.camera = camera;
        this.light = light;
        window.addEventListener('resize', this.onResize);
    }

    /**
     * 将物体移动一段距离
     * @param mesh 目标物体
     * @param diff 移动距离
     */
    move(mesh: Mesh, diff: Point) {
        const {
            x = 0,
            y = 0,
            z = 0
        } = diff;
        const point = new Vector3(x, y, z);
        mesh.position.addInPlace(point);
        if (mesh.metadata.lines.length > 0) {
            this.updateLinesOnMesh(mesh);
        }
    }

    /**
     * 将物体移动到指定位置
     * @param mesh 目标物体
     * @param point 目标位置
     */
    moveTo(mesh: Mesh, point: Point) {
        const {
            x = mesh.position.x,
            y = mesh.position.y,
            z = mesh.position.z
        } = point;
        const diff = {
            x: x - mesh.position.x,
            y: y - mesh.position.y,
            z: z - mesh.position.z
        };
        this.move(mesh, diff);
    }

    /**
     * 创建一个指定类型的物体
     * @param type 物体类型 e.g. box/sphere
     * @param option 初始化参数，具体参考 https://doc.babylonjs.com/divingDeeper/mesh/creation/set
     * @returns 创建的物体，没有匹配的type则返回null
     */
    addMesh(type: string, option: any) {
        const opt = {};
        let mesh: Mesh = null;
        switch (type) {
            case 'box':
                Tools.DeepCopy(opt, option);
                mesh = MeshBuilder.CreateBox(Tools.RandomId(), opt, this.scene);
                break;
            case 'sphere':
                Tools.DeepCopy(opt, option);
                mesh = MeshBuilder.CreateSphere(Tools.RandomId(), opt, this.scene);
                break;
        }
        if (mesh) {
            mesh.metadata = { type, lines: [] };
        }
        return mesh;
    }

    /**
     * 从场景中移除一个物体
     * @param mesh 目标物体
     */
    removeMesh(mesh: Mesh) {
        this.disconnectLinesOnMesh(mesh);
        mesh.dispose();
        this.scene.removeMesh(mesh);
    }

    /**
     * 创建一条线以连接两个物体
     * @param mesh1 起始物体
     * @param mesh2 终止物体
     * @returns 连接的线
     */
    addLine(mesh1: Mesh, mesh2: Mesh) {
        const points = [mesh1.position, mesh2.position];
        const option: any = {
            points,
            updatable: true
        };
        const line = MeshBuilder.CreateLines(Tools.RandomId(), option, this.scene);
        option.instance = line;
        line.metadata = {
            option,
            from: mesh1,
            to: mesh2
        };
        mesh1.metadata.lines.push(line);
        mesh2.metadata.lines.push(line);
        return line;
    }

    /**
     * 从场景中移除一条线
     * @param line 线
     */
    removeLine(line: LinesMesh) {
        const { from, to } = line.metadata;
        if (from) {
            this.disconnectLine(from, line);
        }
        if (to) {
            this.disconnectLine(from, line);
        }
        line.dispose();
        this.scene.removeMesh(line);
    }

    /**
     * 从场景中移除所有与目标物体关联的线
     * @param mesh 目标物体
     */
    removeLinesOnMesh(mesh: Mesh) {
        const { lines } = mesh.metadata;
        [...lines].forEach(line => {
            this.removeLine(line);
        });
    }

    /**
     * 更新一条线
     * 在babylonjs中，直接修改线的顶点坐标无法直接改变线，必须使用MeshBuilder.CreateLines更新
     * @param line 要更新的线
     */
    updateLine(line: LinesMesh) {
        MeshBuilder.CreateLines(line.name, line.metadata.option, this.scene);
    }

    /**
     * 更新目标物体上的所有关联的线
     * @param mesh 目标物体
     */
    updateLinesOnMesh(mesh: Mesh) {
        mesh.metadata.lines.forEach((line: LinesMesh) => this.updateLine(line));
    }

    /**
     * 将目标物体和目标线建立关联关系
     * @param mesh 目标物体
     * @param line 目标线
     * @param type 物体是线的起始物体还是终止物体。from: 起始  to: 终止
     */
    connectLine(mesh: Mesh, line: LinesMesh, type: 'from' | 'to') {
        const { lines } = mesh.metadata;
        const { option } = line.metadata;
        if (type === 'from') {
            line.metadata.from = mesh;
            option.points[0] = mesh.position;
        }
        if (type === 'to') {
            line.metadata.to = mesh;
            option.points[option.points.length - 1] = mesh.position;
        }
        if (!lines.find((l: LinesMesh) => l.name === line.name)) {
            lines.push(line);
        }
        this.updateLine(line);
    }

    /**
     * 解除目标物体与目标线的关联关系
     * @param mesh 目标物体
     * @param line 目标线
     */
    disconnectLine(mesh: Mesh, line: LinesMesh) {
        const { lines } = mesh.metadata;
        const { from, to, option } = line.metadata;
        if (from && from.name === mesh.name) {
            line.metadata.from = null;
            option.points[0] = option.points[0].clone();
        }
        if (to && to.name === mesh.name) {
            line.metadata.to = null;
            option.points[option.points.length - 1] = option.points[option.points.length - 1].clone();
        }
        const index = lines.findIndex((l: LinesMesh) => l.name === line.name);
        if (index > -1) {
            lines.splice(index, 1);
        }
        this.updateLine(line);
    }

    /**
     * 解除目标物体上所有关联线的关联关系
     * 此方法不会从场景中移除线，只是解除关联关系
     * @param mesh 目标物体
     */
    disconnectLinesOnMesh(mesh: Mesh) {
        const { lines } = mesh.metadata;
        [...lines].forEach(line => {
            this.disconnectLine(mesh, line);
        });
    }

    /**
     * 寻找目标物体所在嵌套关系中的根物体
     * @param mesh 目标物体
     * @returns 根物体
     */
    root(mesh: Mesh) {
        if (mesh.parent) {
            return this.root(mesh.parent as Mesh);
        }
        return mesh;
    }

    /**
     * 从文件中导入物体
     * @param rootPath 文件所在目录（不包含文件名）
     * @param name 文件名
     * @param meshName 要导入的物体名称。不传或者空字符串表示导入所有物体
     * @returns result: 所有内容   rootMesh: 根物体
     */
    async importMesh(rootPath: string, name: string, meshName: string | string[] = '') {
        // 从文件中导入mesh
        // 第一个参数为空字符串时，表示导入所有mesh
        // 第二个参数为文件所在路径
        // 第三个参数为文件名
        const result = await SceneLoader.ImportMeshAsync('', rootPath, name, this.scene);
        const { meshes, transformNodes, geometries } = result;
        // 重新给mesh设置name，保证全局唯一
        meshes.forEach(mesh => mesh.name = Tools.RandomId());
        transformNodes.forEach(node => node.name = Tools.RandomId());
        geometries.forEach(geometry => geometry.id = Tools.RandomId());
        const rootMesh = meshes.find(mesh => !mesh.parent);
        if (!rootMesh.metadata) {
            rootMesh.metadata = {};
        }
        rootMesh.metadata.type = 'import';
        rootMesh.metadata.lines = [];
        return { result, rootMesh };
    }

    onResize = () => {
        this.engine.resize();
    }

    destroy() {
        window.removeEventListener('resize', this.onResize);
    }
}

export {
    Viewer3d
}