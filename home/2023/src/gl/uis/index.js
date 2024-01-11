import { Haptix } from "./haptix.js";
import { Mappetplace } from "./mappetplace.js";
import { Eto } from "./eto.js";
import { Otru } from "./otru.js";

export function getUi(sel) {
  switch (sel) {
    case 0:
      return Mappetplace;
    case 1:
      return Haptix;
    case 2:
      return Eto;
    case 3:
      return Otru;
    default:
      return Mappetplace;
  }
}
