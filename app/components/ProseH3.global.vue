<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <ProseHeading :id="id" :level="3"><slot /></ProseHeading>
</template>
