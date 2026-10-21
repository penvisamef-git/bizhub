import CardView, { CARD_RECIPES } from "../../../namecard/CardView";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import { namecardService } from "../../../api/services";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Pay coins to unlock one premium theme for this card (shows the user's own card in that theme)
export default function UnlockThemeModal({ businessId, theme, price, preview, c, onClose, onUnlocked }) {
  const name = c.themeNames[theme] || CARD_RECIPES[theme]?.[c.lang] || CARD_RECIPES[theme]?.en || theme;
  return (
    <PurchaseModal
      stage={
        <div className="ul-card-scale">
          <CardView card={{ ...preview, theme, portfolio: false }} labels={{ yourName: c.yourName, fields: c.fields }} compact />
        </div>
      }
      badge={c.premiumThemes}
      title={c.unlockTitle.replace("{theme}", name)}
      sub={c.unlockSub}
      perks={c.unlockPerks}
      price={price}
      buyLabel={c.unlockFor.replace("{coins}", `${fmt(price)} ${c.coins}`)}
      buy={() => namecardService.unlock(businessId, theme)}
      doneTitle={c.unlockedTitle}
      doneSub={c.unlockedSub.replace("{theme}", name)}
      doneButton={c.useTheme}
      onDone={(r) => onUnlocked(r?.data || null)}
      onClose={onClose}
    />
  );
}
