<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <ProseHeading :id="id" :level="4"><slot /></ProseHeading>
</template>
