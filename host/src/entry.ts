// The tokens and the shell first, then the faces they name, then this site's
// own pages. Order matters for the cascade: the landing page's rules read the
// tokens and override the few shell rules that were written for the shorter
// page at the same address.
import '@aleph-garden/host-core/style.css'
import '@aleph-garden/brand/fonts.css'
import '@aleph-garden/starlight-theme/footer.css'
import './landing.css'
import { boot } from '@aleph-garden/host-core'
import ambientSource from '../../public/ns/vitrine?ambient'
import { gardenHost } from './host.ts'

/** host-core installs its own chrome on every boot, and that chrome is the
 *  corner pill carrying the session controls. This deployment shows neither:
 *  the root draws the landing page with its own header, and `/-/<iri>` draws
 *  the resource and nothing around it. The pill is therefore given a frame
 *  that is never appended, so it exists in memory and not in the document.
 *  The ceiling: host-core has no way for a host to decline the chrome. Once
 *  it does, this goes and `boot` is called without a chrome element.
 *  aleph-garden/vitrine#2 */
function unusedChrome(): Element {
  const frame = document.createElement('div')
  frame.className = 'frame'
  for (const slot of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    const corner = document.createElement('div')
    corner.className = `corner ${slot}`
    frame.append(corner)
  }
  return frame
}

const sources = { ambient: ambientSource }

void boot(gardenHost(sources), unusedChrome(), document.getElementById('root')!)
