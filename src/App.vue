<script setup lang="ts">
import { onMounted } from "@vue/runtime-core";

onMounted(() => {
  const canvas = document.getElementById("babylon-root");
  console.log(canvas);
});
</script>

<template>
  <canvas id="babylon-root"></canvas>
</template>

<style>
html, body, #app, #babylon-root {
  width: 100%;
  height: 100%;
}
</style>
