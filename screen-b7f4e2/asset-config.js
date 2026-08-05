window.RECALL_CLOCK_ASSETS = Object.freeze({
  mode: 'placeholder',
  hour: Object.freeze({
    enabled: false,
    fallback: 'assets/videos/hour-placeholder.mp4',
    template: 'assets/hour/{value}.mp4'
  }),
  minute: Object.freeze({
    enabled: false,
    fallback: 'assets/videos/minute-placeholder.mp4',
    template: 'assets/minute/{value}.mp4'
  }),
  second: Object.freeze({
    enabled: false,
    fallback: 'assets/videos/second-placeholder.mp4',
    source: 'assets/second/seconds-00-59.mp4',
    cycleSeconds: 60
  })
});
