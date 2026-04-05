import readingTime from 'reading-time'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('content:file:beforeParse', (file) => {
    const contentFile = file as {
      extension?: string
      body: string
      data?: Record<string, unknown>
    }
    if (contentFile.extension !== '.md') return

    const stats = readingTime(contentFile.body)
    contentFile.data = contentFile.data || {}
    contentFile.data.readingTime = Math.max(1, Math.ceil(stats.minutes))
    contentFile.data.words = stats.words
  })
})
