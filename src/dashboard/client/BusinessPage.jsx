import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { myBusinessService } from "../../api/services";
import { memo } from "../../lib/memo";
import { BusinessSkeleton, EditorSkeleton } from "../../components/skeleton/Skeleton";

import { PAGES } from "../../pages";
import TeamBar from "./team/TeamBar";
import { loadShared } from "./team/SharedSection";

// same files as the background download (pages.js), so a dashboard downloaded early opens at once
const NameCardEditor = lazy(PAGES.nameCardEditor);
const RestaurantDashboard = lazy(PAGES.restaurant);
const AttendanceDashboard = lazy(PAGES.attendance);
const GuestHouseDashboard = lazy(PAGES.guestHouse);
const MartDashboard = lazy(PAGES.mart);
const MenuQrDashboard = lazy(PAGES.menuQr);
const FlipBookDashboard = lazy(PAGES.flipbook);
const QrGenDashboard = lazy(PAGES.qrGen);
const WebsiteDashboard = lazy(PAGES.website);
const DebtDashboard = lazy(PAGES.debt);
const NoteDashboard = lazy(PAGES.note);
const StampDashboard = lazy(PAGES.stamp);
const EventDashboard = lazy(PAGES.event);
const TgStoreDashboard = lazy(PAGES.tgStore);

const sharedOf = (id) => (memo.get("sharedBusinesses") || []).find((b) => b._id === id && b.team_on);

// /app/business/:id → the right screen for the business type (mine, or one shared with me by its owner)
export default function BusinessPage() {
  const { id } = useParams();
  const known = (memo.get("myBusinesses") || []).find((b) => b._id === id);
  const [shared, setShared] = useState(() => (known ? null : sharedOf(id) || null));
  const [category, setCategory] = useState(known?.category || shared?.category || null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (category) return;
    myBusinessService
      .list()
      .then(async (r) => {
        memo.set("myBusinesses", r.data || []);
        const b = (r.data || []).find((x) => x._id === id);
        if (b) return setCategory(b.category);
        // not mine: a business I'm on the team of?
        const s = await loadShared()
          .then((d) => d.businesses.find((x) => x._id === id && x.team_on))
          .catch(() => null);
        if (s) {
          setShared(s);
          setCategory(s.category);
        } else setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [id, category]);

  // a shared business: keep my role fresh (the owner may change it or remove me)
  useEffect(() => {
    if (!shared) return;
    loadShared()
      .then((d) => {
        const s = d.businesses.find((x) => x._id === id && x.team_on);
        if (s) setShared(s);
        else setMissing(true);
      })
      .catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) return <Navigate to="/app/dashboard" replace />;
  // the right loading shape for the business type (unknown yet → the general one)
  const skeleton = category === "namecard" ? <EditorSkeleton tabs /> : <BusinessSkeleton />;
  if (!category) return skeleton;
  return (
    <Suspense fallback={skeleton}>
      <TeamBar id={id} shared={shared} />
      {category === "restaurant" ? (
        <RestaurantDashboard key={id} />
      ) : category === "attendance" ? (
        <AttendanceDashboard key={id} />
      ) : category === "guest_house" ? (
        <GuestHouseDashboard key={id} />
      ) : category === "mart" ? (
        <MartDashboard key={id} />
      ) : category === "menu_qr" ? (
        <MenuQrDashboard key={id} />
      ) : category === "flipbook" ? (
        <FlipBookDashboard key={id} />
      ) : category === "qr_gen" ? (
        <QrGenDashboard key={id} />
      ) : category === "website" ? (
        <WebsiteDashboard key={id} />
      ) : category === "digital_note" ? (
        <NoteDashboard key={id} />
      ) : category === "debt_book" ? (
        <DebtDashboard key={id} />
      ) : category === "stamp_card" ? (
        <StampDashboard key={id} />
      ) : category === "event" ? (
        <EventDashboard key={id} />
      ) : category === "tg_store" ? (
        <TgStoreDashboard key={id} />
      ) : (
        <NameCardEditor key={id} />
      )}
    </Suspense>
  );
}
