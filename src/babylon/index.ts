import {
    Engine,
    Scene,
} from 'babylonjs';

function init (canvas: HTMLCanvasElement) {
    const engine = new Engine(canvas);
    const scene = new Scene(engine);
    engine.runRenderLoop(() => scene.render());
    return { engine, scene };
}

function createMesh() {

}