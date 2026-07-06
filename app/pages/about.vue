<script setup lang="ts">
const { data: about } = await useAsyncData('about', () => queryContent('/about').findOne())

if (!about.value) {
  throw createError({ statusCode: 404, statusMessage: 'About page missing' })
}

useHead({
  title: 'About',
  meta: [
    { name: 'description', content: 'About LiH Blog, a simple editorial space for engineering notes and everyday life.' }
  ]
})

const profile = {
  name: 'LiH',
  title: 'Writer / Engineer',
  handle: 'lihblog',
  status: 'Notes',
  contactText: 'Detail',
  avatarUrl: 'https://static.igem.wiki/teams/5643/pageimage/team/hyf.webp',
  miniAvatarUrl: 'https://static.igem.wiki/teams/5643/pageimage/team/hyf-a.webp',
  barAvatarUrl: 'https://static.igem.wiki/teams/5643/pageimage/team/hyf-a.webp',
  iconUrl: 'https://static.igem.wiki/teams/5643/img/iconpattern.webp',
  grainUrl: 'https://static.igem.wiki/teams/5643/img/grain.webp',
  behindGradient:
    'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(185,72%,82%,calc(var(--card-opacity)*0.55)) 4%,hsla(194,54%,76%,calc(var(--card-opacity)*0.34)) 18%,hsla(217,30%,70%,calc(var(--card-opacity)*0.16)) 52%,hsla(217,0%,60%,0) 100%),radial-gradient(44% 58% at 58% 16%,#b9f1eda6 0%,#b9f1ed00 100%),radial-gradient(86% 86% at 50% 50%,#d7e2efc0 1%,#2b3d6500 74%),conic-gradient(from 124deg at 50% 50%,#22365aff 0%,#65aab6ff 42%,#fbf8efff 62%,#22365aff 100%))',
  innerGradient: 'linear-gradient(145deg,#fffdf8f5 0%,#eef7f4e8 48%,#b7d9e0d4 100%)',
  description:
    'A quiet personal blog about engineering, interfaces, and everyday observations. The writing stays first; the interface only adds a little atmosphere.'
}
</script>

<template>
  <div class="about-page container animate-rise">
    <section class="about-layout">
      <div class="about-main">
        <header class="about-header">
          <p class="eyebrow">About</p>
          <h1>Quiet notes, built with care.</h1>
          <p>A simple editorial space for engineering, design, and everyday life.</p>
        </header>

        <article class="about-content prose">
          <ContentRenderer :value="about" />
        </article>
      </div>

      <aside class="about-side" aria-label="Profile">
        <AboutProfileCard
          class-name="about-profile-card"
          :name="profile.name"
          :title="profile.title"
          :handle="profile.handle"
          :status="profile.status"
          :contact-text="profile.contactText"
          :avatar-url="profile.avatarUrl"
          :mini-avatar-url="profile.miniAvatarUrl"
          :bar-avatar-url="profile.barAvatarUrl"
          :icon-url="profile.iconUrl"
          :grain-url="profile.grainUrl"
          :behind-gradient="profile.behindGradient"
          :inner-gradient="profile.innerGradient"
          :description="profile.description"
        />
      </aside>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  padding-top: 44px;
  padding-bottom: 96px;
}

.about-layout {
  display: grid;
  grid-template-columns: minmax(0, 650px) minmax(340px, 386px);
  gap: clamp(48px, 7vw, 96px);
  align-items: start;
}

.about-main {
  min-width: 0;
}

.about-header {
  padding-bottom: 28px;
  border-bottom: 1px solid var(--line);
}

.about-header h1 {
  margin-top: 18px;
  color: var(--heading);
  font-family: var(--font-display);
  font-size: clamp(3rem, 6.2vw, 5.4rem);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.025em;
}

.about-header p:last-child {
  max-width: 36rem;
  margin-top: 22px;
  color: var(--muted);
  font-size: clamp(1.02rem, 1.36vw, 1.18rem);
  line-height: 1.7;
}

.about-content {
  max-width: 620px;
  margin-top: 34px;
  font-size: 1.04rem;
}

.about-content :deep(p) {
  max-width: 37rem;
}

.about-content :deep(h2:first-child) {
  margin-top: 0;
}

.about-side {
  position: sticky;
  top: 112px;
  display: flex;
  justify-content: center;
  padding-top: 52px;
}

.about-side :deep(.about-profile-card) {
  width: min(100%, 372px);
}

@media (max-width: 900px) {
  .about-layout {
    grid-template-columns: 1fr;
    gap: 34px;
  }

  .about-side {
    position: static;
    justify-content: flex-start;
    padding-top: 0;
  }

  .about-side :deep(.about-profile-card) {
    width: min(100%, 334px);
  }
}

@media (max-width: 560px) {
  .about-page {
    padding-top: 22px;
    padding-bottom: 72px;
  }

  .about-header {
    padding-bottom: 22px;
  }

  .about-header h1 {
    font-size: clamp(2.85rem, 15vw, 4.3rem);
  }

  .about-content {
    margin-top: 28px;
  }

  .about-side :deep(.about-profile-card) {
    width: min(100%, 304px);
  }
}
</style>
