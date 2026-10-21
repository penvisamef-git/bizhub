import DashboardPage from "./DashboardPage";

// "Businesses" (phone bottom bar, same as the app): only the list of the owner's businesses — search, type filter, add
export default function BusinessesPage() {
  return <DashboardPage only="businesses" />;
}
