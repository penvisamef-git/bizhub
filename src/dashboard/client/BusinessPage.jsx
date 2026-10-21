import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { myBusinessService } from "../../api/services";
import { memo } from "../../lib/memo";
import { BusinessSkeleton, EditorSkeleton } from "../../components/skeleton/Skeleton";

import { PAGES } from "../../pages";

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

// /app/business/:id → the right screen for the business type
export default function BusinessPage() {
  const { id } = useParams();
  const known = (memo.get("myBusinesses") || []).find((b) => b._id === id);
  const [category, setCategory] = useState(known?.category || null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (category) return;
    myBusinessService
      .list()
      .then((r) => {
        memo.set("myBusinesses", r.data || []);
        const b = (r.data || []).find((x) => x._id === id);
        if (b) setCategory(b.category);
        else setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [id, category]);

  if (missing) return <Navigate to="/app/dashboard" replace />;
  // the right loading shape for the business type (unknown yet → the general one)
  const skeleton = category === "namecard" ? <EditorSkeleton tabs /> : <BusinessSkeleton />;
  if (!category) return skeleton;
  return (
    <Suspense fallback={skeleton}>
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
      ) : (
        <NameCardEditor key={id} />
      )}
    </Suspense>
  );
}
