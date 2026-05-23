'use client';

/**
 * MobileCallFab — disabled po redesign chatu.
 *
 * Před redesignem: input byl fixed bottom-0 a FAB byl floating call button
 * nad ním (bottom-28). Po redesignu (input je inline ve flex column) FAB
 * překrýval input → smysl ztracen.
 *
 * Náhrada:
 * - "Expert" button pod inputem (v ChatArea meta řádce)
 * - "Zavolat Davidovi" v /dashboard Hugo kartě
 * - tel: link v /podminky a footeru
 *
 * Component je zachován jako no-op (vrátí null), aby parent komponenta
 * nemusela měnit JSX. Smazat lze v dalším cleanup commitu.
 */
interface Props {
  hasSeenWidget: boolean;
  hasConverted: boolean;
}

export function MobileCallFab(_props: Props) {
  return null;
}
