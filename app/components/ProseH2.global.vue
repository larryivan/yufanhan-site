<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <ProseHeading :id="id" :level="2"><slot /></ProseHeading>
</template>
