import packageJson from './package.json'
 
function checkUpdate() {
  const oldTime = Number(sessionStorage.getItem('UpdateTime'))
  const curTime = Date.now()
  if (oldTime && oldTime + 60 * 1000 > curTime) return
  fetch(`${window.location.origin}/versions.json`, { cache: 'no-cache' }).then(async res => {
    const { version, must } = await res.json()
    sessionStorage.setItem('UpdateTime', curTime)
    if (packageJson.version != version && must) {
      return window.location.reload()
    } else if (packageJson.version != version) {
      const isConfirm = confirm('有可用更新，是否立即更新')
      if (isConfirm) window.location.reload()
    }
  })
}

export default checkUpdate