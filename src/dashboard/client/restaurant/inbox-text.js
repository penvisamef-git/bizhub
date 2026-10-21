import { useI18n } from "../../../i18n/I18nProvider";

const TEXT = {
  en: {
    title: "Inbox",
    sub: "Messages people send from “Send us a message” on your website.",
    alsoTelegram: "New ones are also sent to your Telegram.",
    unreadCount: "{n} unread",
    allRead: "All read",
    all: "All",
    unread: "Unread",
    markAll: "Mark all as read",
    empty: "No messages yet. When someone writes to you on your website, it shows up here.",
    noUnread: "No unread messages.",
    openWebsite: "Set up your website",
    needWebsite: "Messages come from your restaurant website. Turn on the Website add-on to get them.",
    kinds: { feedback: "Feedback", request: "Request", booking: "Booking", other: "Other" },
    justNow: "just now",
    minAgo: "{n} min ago",
    hourAgo: "{n} h ago",
    replyEmail: "Reply by email",
    call: "Call",
    markUnread: "Mark unread",
    delete: "Delete",
    more: "Show more",
  },
  km: {
    title: "សារ",
    sub: "សារដែលមនុស្សផ្ញើពី “ផ្ញើសារមកយើង” លើគេហទំព័ររបស់អ្នក។",
    alsoTelegram: "សារថ្មីក៏ផ្ញើទៅតេឡេក្រាមរបស់អ្នកដែរ។",
    unreadCount: "មិនទាន់អាន {n}",
    allRead: "បានអានទាំងអស់",
    all: "ទាំងអស់",
    unread: "មិនទាន់អាន",
    markAll: "សម្គាល់ថាបានអានទាំងអស់",
    empty: "មិនទាន់មានសារទេ។ ពេលមាននរណាម្នាក់សរសេរមកអ្នកលើគេហទំព័រ វានឹងបង្ហាញនៅទីនេះ។",
    noUnread: "គ្មានសារមិនទាន់អានទេ។",
    openWebsite: "រៀបចំគេហទំព័ររបស់អ្នក",
    needWebsite: "សារមកពីគេហទំព័រភោជនីយដ្ឋានរបស់អ្នក។ សូមបើក “គេហទំព័រ” ដើម្បីទទួលសារ។",
    kinds: { feedback: "មតិយោបល់", request: "សំណើ", booking: "កក់តុ", other: "ផ្សេងៗ" },
    justNow: "ទើបតែ",
    minAgo: "{n} នាទីមុន",
    hourAgo: "{n} ម៉ោងមុន",
    replyEmail: "ឆ្លើយតាមអ៊ីមែល",
    call: "ទូរស័ព្ទ",
    markUnread: "សម្គាល់ថាមិនទាន់អាន",
    delete: "លុប",
    more: "បង្ហាញបន្ថែម",
  },
};

export function useInboxText() {
  const { lang } = useI18n();
  return TEXT[lang] || TEXT.en;
}
