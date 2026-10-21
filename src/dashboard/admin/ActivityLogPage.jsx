import React, { useEffect, useMemo, useState } from "react";
import MasterDataPage from "./master_data/MasterDataPage";
import { activityLogService } from "../../api/services";

const CATEGORY_LABELS = {
  other: "ផ្សេងៗ",
  auth: "ចូល / ចេញគណនី",
  user: "អ្នកប្រើប្រាស់",
  setting: "ការកំណត់",
  homepage: "គេហទំព័រ",
};

const COLUMNS = [
  { key: "time", label: "ពេលវេលា", render: (row) => <span style={{ whiteSpace: "nowrap" }}>{row.time || "-"}</span> },
  {
    key: "title",
    label: "សកម្មភាព",
    render: (row) => (
      <>
        <b>{row.title}</b>
        {row.description && <span className="md-sub">{row.description}</span>}
      </>
    ),
  },
  {
    key: "category",
    label: "ប្រភេទ",
    render: (row) => {
      const t = row.activity_log_category_id?.title;
      return <span className="md-badge md-badge-gold">{CATEGORY_LABELS[t] || t || "-"}</span>;
    },
  },
  {
    key: "by",
    label: "ដោយ",
    render: (row) => {
      const u = row.create_by_id;
      return u ? (
        <>
          {`${u.firstname || ""} ${u.lastname || ""}`.trim()}
          <span className="md-sub">{u.email}</span>
        </>
      ) : (
        "-"
      );
    },
  },
  { key: "device", label: "ឧបករណ៍", render: (row) => (row.device ? `${row.device.device} · ${row.device.browser}` : "-") },
];

const SEARCH_KEYS = ["title", "description"];

// Read-only list of what happened in the system
function ActivityLogPage() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    activityLogService
      .categories()
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  const filters = useMemo(
    () => [
      {
        key: "category",
        label: "-- ប្រភេទទាំងអស់ --",
        options: categories.map((c) => ({ value: c.title, label: CATEGORY_LABELS[c.title] || c.title })),
      },
    ],
    [categories],
  );

  return (
    <MasterDataPage
      title="កំណត់ត្រា"
      service={activityLogService}
      fields={[]}
      columns={COLUMNS}
      searchKeys={SEARCH_KEYS}
      filters={filters}
      canEdit={false}
    />
  );
}

export default ActivityLogPage;
