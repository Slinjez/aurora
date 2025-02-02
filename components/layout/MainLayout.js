import SideNarrow from "./SideNarrow";
import Header from "./Header";

const MainLayout = ({ children, sideNarrow }) => (
  <div className="sm:h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
    {sideNarrow && <SideNarrow />}
    <div className="flex min-w-0 flex-1 overflow-y-auto justify-center">
      <div className="flex-1 relative z-0 flex max-w-5xl">
        <main className="flex-1 relative z-0 focus:outline-none xl:order-last" tabIndex="0">
          <Header />
          <div className="inset-0 py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  </div>
);

export default MainLayout;
