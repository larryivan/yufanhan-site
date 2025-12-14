import readingTime from 'reading-time'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('content:file:beforeParse', (file) => {
    if (file.extension !== '.md') return

    const stats = readingTime(file.body)
    file.data = file.data || {}
    file.data.readingTime = Math.max(1, Math.ceil(stats.minutes))
    file.data.words = stats.words
  })
})
