<script setup lang="ts">
import { onMounted } from "@vue/runtime-core";
import { Viewer3d } from "./viewer3d";

onMounted(() => {
  const canvas = document.getElementById("babylon-root") as HTMLCanvasElement;
  const viewer3d = new Viewer3d(canvas);
  // 创建一个盒子
  const box = viewer3d.addMesh("box", {});
  // 创建一个球
  const sphere = viewer3d.addMesh("sphere", {});
  viewer3d.moveTo(box, { x: -30 });
  viewer3d.moveTo(sphere, { x: 30 });
  viewer3d.addLine(box, sphere);
});
</script>

<template>
  <canvas id="babylon-root"></canvas>
</template>

<style>
html,
body,
#app,
#babylon-root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
