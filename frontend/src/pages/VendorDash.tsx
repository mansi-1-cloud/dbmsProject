"use client";

import React, { useState, useEffect, useId, useRef } from "react";
// Import the sidebar components using the alias
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  // Icons for sidebar
  IconArrowLeft,
  IconBrandTabler,
  IconUser,
  IconClipboardList,
  // Icons for stat cards
  IconUsers,
  IconClock,
  IconCircleCheck,
  // Icons for user details
  IconMail,
  IconPhone,
  IconMapPin,
  IconFileDescription,
  IconFileSpreadsheet,
  IconFileText,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
// Import the hook using the alias
import { useOutsideClick } from "@/hooks/use-outside-click";

// --- Define Card Type ---
type Card = {
  description: string;
  title: string;
  src?: string; // src is optional
  ctaText: string;
  ctaLink: string;
  component: React.ComponentType;
};

// --- Main Vendor Dashboard Component ---
export function VendorDashboard() {
  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700" />
      ),
    },
    {
      label: "Requests",
      href: "#",
      icon: (
        <IconClipboardList className="h-5 w-5 shrink-0 text-neutral-700" />
      ),
    },
    {
      label: "Profile",
      href: "/vendor/profile",
      icon: <IconUser className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
  ];

  const logoutLink = {
    label: "Logout",
    href: "/hero",
    icon: <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700" />,
  };

  const [open, setOpen] = useState(false);
  return (
    // Main container with light background
    <div
      className={cn(
        "mx-auto flex w-full max-w-full flex-1 flex-col overflow-hidden bg-gray-100 md:flex-row",
        "h-screen", // Full screen height
      )}
    >
      {/* Sidebar Component */}
      <Sidebar
        open={open}
        setOpen={setOpen}
      >
        <SidebarBody className="justify-between gap-10 text-black bg-white border-r border-gray-200">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          {/* Logout link at the bottom */}
          <div>
            <SidebarLink link={logoutLink} />
          </div>
        </SidebarBody>
      </Sidebar>
      {/* Main Content Area */}
      <VendorDashboardContent />
    </div>
  );
}

// --- Logo Components (Light theme) ---
export const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black"
      >
        Vendor Menu
      </motion.span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black" />
    </a>
  );
};

// --- Main Dashboard Content Component ---
const VendorDashboardContent = () => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "queue">("upcoming");

  return (
    <div className="flex flex-1 h-full">
      <div className="flex h-full w-full flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-black">Vendor Dashboard</h1>
        </div>

        {/* Welcome and Stat Cards */}
        <div className="p-4 md:p-10">
          <h2 className="text-2xl font-bold text-black">Welcome, Vendor!</h2>
          <p className="text-gray-600 mb-6">
            Manage incoming requests and track your queue
          </p>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard
              title="Pending Requests"
              value="3"
              icon={<IconUsers className="h-6 w-6 text-blue-500" />}
            />
            <StatCard
              title="In Queue"
              value="2"
              icon={<IconClock className="h-6 w-6 text-yellow-500" />}
            />
            <StatCard
              title="Completed Today"
              value="5"
              icon={<IconCircleCheck className="h-6 w-6 text-green-500" />}
            />
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <TabButton
              title="Upcoming Requests"
              count={3}
              isActive={activeTab === "upcoming"}
              onClick={() => setActiveTab("upcoming")}
            />
            <TabButton
              title="Current Queue"
              count={2}
              isActive={activeTab === "queue"}
              onClick={() => setActiveTab("queue")}
            />
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg p-4 md:p-6">
            {activeTab === "upcoming" ? (
              <ExpandableCardDemo cards={upcomingRequestsCards} />
            ) : (
              <ExpandableCardDemo cards={currentQueueCards} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Tab Button Component ---
const TabButton = ({
  title,
  count,
  isActive,
  onClick,
}: {
  title: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "py-3 px-4 flex items-center gap-2 font-medium text-sm",
        isActive
          ? "border-b-2 border-blue-500 text-blue-500"
          : "text-gray-500 hover:text-black"
      )}
    >
      <span>{title}</span>
      <span
        className={cn(
          "py-0.5 px-2 rounded-full text-xs",
          isActive
            ? "bg-blue-100 text-blue-600"
            : "bg-gray-200 text-gray-700"
        )}
      >
        {count}
      </span>
    </button>
  );
};

// --- Stat Card Component ---
const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-black">{value}</p>
      </div>
      <div className="rounded-full bg-gray-100 p-3">{icon}</div>
    </div>
  );
};

// --- ExpandableCardDemo Component (Modified for props and light theme) ---
function ExpandableCardDemo({ cards }: { cards: Card[] }) {
  const [active, setActive] = useState<Card | boolean | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      <AnimatePresence>
        {active && typeof active === "object" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 h-full w-full z-10" // Light overlay
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && typeof active === "object" ? (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-2 right-2 lg:hidden items-center justify-center bg-white rounded-full h-8 w-8"
              onClick={() => setActive(null)}
            >
              <CloseIcon />
            </motion.button>
            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white text-black sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div>
                <div className="flex justify-between items-start p-4">
                  <div className="">
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-bold text-neutral-800"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.description}-${id}`}
                      className="text-neutral-600"
                    >
                      {active.description}
                    </motion.p>
                  </div>
                </div>
                <div className="pt-4 relative px-4">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-neutral-700 text-xs md:text-sm lg:text-base h-auto md:h-fit pb-10 flex flex-col items-start gap-4 overflow-auto"
                  >
                    {/* We render the custom component here */}
                    <active.component />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      <ul className="max-w-none mx-auto w-full gap-4 flex flex-col">
        {cards.map((card, index) => (
          <motion.div
            layoutId={`card-${card.title}-${id}`}
            key={`card-${card.title}-${id}`}
            onClick={() => setActive(card)}
            className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent"
          >
            <div className="flex gap-4 flex-col md:flex-row ">
              <div className="">
                <motion.h3
                  layoutId={`title-${card.title}-${id}`}
                  className="font-medium text-neutral-800 text-center md:text-left"
                >
                  {card.title}
                </motion.h3>
                <motion.p
                  layoutId={`description-${card.description}-${id}`}
                  className="text-neutral-600 text-center md:text-left"
                >
                  {card.description}
                </motion.p>
              </div>
            </div>
            <motion.button
              layoutId={`button-${card.title}-${id}`}
              className="px-4 py-2 text-sm rounded-full font-bold bg-gray-100 hover:bg-gray-200 text-black mt-4 md:mt-0"
            >
              {card.ctaText}
            </motion.button>
          </motion.div>
        ))}
      </ul>
    </>
  );
}

// --- CloseIcon Component (Light theme) ---
export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-black"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};

// --- Custom Content Components (Light theme) ---
const ProjectProposalReviewContent = () => {
  return (
    <div className="w-full">
      <h4 className="text-sm font-bold uppercase text-gray-400 mb-4">
        User Details
      </h4>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <IconMail className="h-4 w-4 text-gray-500" />
          <span className="text-gray-800">john.anderson@example.com</span>
        </div>
        <div className="flex items-center gap-2">
          <IconPhone className="h-4 w-4 text-gray-500" />
          <span className="text-gray-800">+1 (555) 123-4567</span>
        </div>
        <div className="flex items-center gap-2">
          <IconMapPin className="h-4 w-4 text-gray-500" />
          <span className="text-gray-800">
            123 Business Street, New York, NY 10001
          </span>
        </div>
      </div>

      <h4 className="text-sm font-bold uppercase text-gray-400 mt-8 mb-4">
        Attached Files (3)
      </h4>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 p-3 rounded-md bg-gray-100">
          <IconFileDescription className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Budget_2024.pdf
            </p>
            <p className="text-xs text-gray-500">PDF • 2.3 MB</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md bg-gray-100">
          <IconFileSpreadsheet className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Financial_Report.xlsx
            </p>
            <p className="text-xs text-gray-500">Excel • 1.8 MB</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md bg-gray-100">
          <IconFileText className="h-5 w-5 text-blue-700" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Proposal_Draft.docx
            </p>
            <p className="text-xs text-gray-500">Word • 438 KB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MarketingPackageContent = () => {
  return (
    <p>
      Placeholder content for Marketing Package. This can be replaced with
      details about Q4 marketing materials, brand guidelines, and associated
      assets.
    </p>
  );
};

const FinancialReviewContent = () => {
  return (
    <p>
      Placeholder content for Financial Review. This can be replaced with
      details about Q4 financial reports, forecasts, and key performance
      indicators.
    </p>
  );
};

const WebsiteRedesignContent = () => {
  return (
    <div className="w-full">
      <h4 className="text-sm font-bold uppercase text-gray-400 mb-4">
        User Details
      </h4>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <IconMail className="h-4 w-4 text-gray-500" />
          <span className="text-gray-800">john.anderson@example.com</span>
        </div>
        <div className="flex items-center gap-2">
          <IconPhone className="h-4 w-4 text-gray-500" />
          <span className="text-gray-800">+1 (555) 123-4567</span>
        </div>
      </div>

      <h4 className="text-sm font-bold uppercase text-gray-400 mt-8 mb-4">
        Attached Files (2)
      </h4>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 p-3 rounded-md bg-gray-100">
          <IconFileDescription className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Budget_2024.pdf
            </p>
            <p className="text-xs text-gray-500">PDF • 2.3 MB</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md bg-gray-100">
          <IconFileSpreadsheet className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Financial_Report.xlsx
            </p>
            <p className="text-xs text-gray-500">Excel • 1.8 MB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileAppDevelopmentContent = () => {
  return (
    <p>
      Placeholder content for Mobile App Development. This can be replaced with
      project scopes, platform requirements, and feature lists.
    </p>
  );
};

// --- Data Arrays ---
const upcomingRequestsCards: Card[] = [
  {
    description: "Annual budget proposal and financial documents",
    title: "Project Proposal Review",
    ctaText: "View Details",
    ctaLink: "#",
    component: ProjectProposalReviewContent,
  },
  {
    description: "Marketing materials and brand guidelines",
    title: "Marketing Package",
    ctaText: "View Details",
    ctaLink: "#",
    component: MarketingPackageContent,
  },
  {
    description: "Q4 financial reports and forecasts",
    title: "Financial Review",
    ctaText: "View Details",
    ctaLink: "#",
    component: FinancialReviewContent,
  },
];

const currentQueueCards: Card[] = [
  {
    description: "Website redesign project in progress",
    title: "Website Redesign",
    ctaText: "View Details",
    ctaLink: "#",
    component: WebsiteRedesignContent,
  },
  {
    description: "Mobile app development ongoing",
    title: "Mobile App Development",
    ctaText: "View Details",
    ctaLink: "#",
    component: MobileAppDevelopmentContent,
  },
];

