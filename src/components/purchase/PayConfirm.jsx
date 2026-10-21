import { useState } from "react";
import { createPortal } from "react-dom";
import CoinIcon from "../CoinIcon";
import { usePurchaseText } from "./text";
import "./purchase-modal.css";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// "Pay with coins?" before any payment that doesn't use the PurchaseModal.
//   const [ask, confirmNode] = usePayConfirm();
//   ask(coins, name, () => pay());   …   {confirmNode}
export function usePayConfirm() {
  const p = usePurchaseText();
  const [st, setSt] = useState(null);
  const ask = (coins, name, fn) => (coins > 0 ? setSt({ coins, name, fn }) : fn());
  const node =
    st &&
    createPortal(
      <div className="ul-ask ul-ask-fixed" role="alertdialog" aria-labelledby="ul-ask-title2" onMouseDown={(e) => e.target === e.currentTarget && setSt(null)}>
        <div className="ul-ask-box">
          <span className="ul-ask-ic">
            <CoinIcon size={30} />
          </span>
          <b id="ul-ask-title2">{p.sure}</b>
          <p>{p.sureSub.replace("{coins}", fmt(st.coins)).replace("{name}", st.name)}</p>
          <div className="ul-ask-row">
            <button type="button" className="ul-ask-no" onClick={() => setSt(null)} autoFocus>
              {p.no}
            </button>
            <button
              type="button"
              className="ul-ask-yes"
              onClick={() => {
                const fn = st.fn;
                setSt(null);
                fn();
              }}
              data-testid="ul-yes"
            >
              <CoinIcon size={16} /> {p.yesPay.replace("{coins}", fmt(st.coins))}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  return [ask, node];
}
