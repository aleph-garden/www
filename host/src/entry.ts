// The tokens and the shell first, then the faces they name, then this site's
// own pages. Order matters for the cascade: the landing page's rules read the
// tokens and override the few shell rules that were written for the shorter
// page at the same address.
import '@aleph-garden/host-core/style.css'
import '../../src/styles/fonts.css'
import './chrome/nav.css'
import './landing.css'
import { boot } from '@aleph-garden/host-core'
import { gardenHost } from './host.ts'

void boot(gardenHost, document.getElementById('chrome')!, document.getElementById('root')!)
