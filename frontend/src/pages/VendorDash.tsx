"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconUser,
  IconClipboardList,
  IconUsers,
  IconClock,
  IconCircleCheck,
  IconMail,
  IconPhone,
  IconMapPin,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { socket } from "@/services/socket";
import type { Token } from "@/types";

type TokenWithUser = Token & {
  user?: {
    name: string;
    email: string;
  };
};

type DashboardStats = {
  pendingCount: number;
  activeCount: number;
  completedToday: number;
  completedTotal: number;
};

type Card = {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  token: TokenWithUser;
  component: React.ComponentType<{ token: TokenWithUser }>;
};

// --- Main Vendor Dashboard Component ---
export function VendorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "VENDOR") {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate("/login", { replace: true });
  };

  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: "Requests",
      href: "#requests",
      icon: <IconClipboardList className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: "Profile",
      href: "/vendor/profile",
      icon: <IconUser className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
  ];

  const logoutLink = {
    label: "Logout",
    href: "#logout",
    icon: <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700" />,
    onClick: handleLogout,
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-full flex-1 flex-col overflow-hidden bg-gray-100 md:flex-row",
        "h-screen",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 bg-white border-r border-gray-200 text-black">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink link={logoutLink} />
          </div>
        </SidebarBody>
      </Sidebar>
      <VendorDashboardContent vendorId={user?.id ?? ""} vendorName={user?.name ?? "Vendor"} />
    </div>
  );
}

// --- Logo Components ---
export const Logo = () => (
  <a href="#" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black">
    <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black" />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium whitespace-pre text-black">
      Vendor Menu
    </motion.span>
  </a>
);

export const LogoIcon = () => (
  <a href="#" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black">
    <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black" />
  </a>
);

// --- Main Dashboard Content Component ---
const VendorDashboardContent = ({ vendorId, vendorName }: { vendorId: string; vendorName: string }) => {
  const [activeTab, setActiveTab] = useState<"pending" | "queue">("pending");
  const [pending, setPending] = useState<TokenWithUser[]>([]);
  const [queue, setQueue] = useState<TokenWithUser[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pendingCount: 0,
    activeCount: 0,
    completedToday: 0,
    completedTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!vendorId) return;
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
      try {
        const [pendingData, queueData, statsData] = await Promise.all([
          api.getVendorPending(vendorId),
          api.getVendorQueue(vendorId),
          api.getVendorStats(vendorId),
        ]);
        setPending(pendingData);
        setQueue(queueData);
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load vendor dashboard data", error);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [vendorId]
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!vendorId) return;
    socket.connect();

    const handleRefresh = () => {
      refreshData({ silent: true });
    };

    const handleQueueUpdate = (tokens: TokenWithUser[]) => {
      setQueue(tokens);
      setStats((prev) => ({ ...prev, activeCount: tokens.length }));
      refreshData({ silent: true });
    };

    socket.on("token.created", handleRefresh);
    socket.on("token.cancelled", handleRefresh);
    socket.on("queue.update", handleQueueUpdate);

    return () => {
      socket.off("token.created", handleRefresh);
      socket.off("token.cancelled", handleRefresh);
      socket.off("queue.update", handleQueueUpdate);
      socket.disconnect();
    };
  }, [vendorId, refreshData]);

  const pendingCards = useMemo(
    () => pending.map((token) => createCard(token, "pending")),
    [pending]
  );
  const queueCards = useMemo(
    () => queue.map((token) => createCard(token, "queue")),
    [queue]
  );

  if (!vendorId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-600">Vendor information missing.</p>
      </div>
    );
  }

  if (loading) {
    return <DashboardLoader />;
  }

  const isPending = activeTab === "pending";
  const cardsToDisplay = isPending ? pendingCards : queueCards;

  return (
    <div className="flex flex-1 h-full" id="requests">
      <div className="flex h-full w-full flex-1 flex-col overflow-y-auto">
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-black">Vendor Dashboard</h1>
        </div>

        <div className="p-4 md:p-10">
          <h2 className="text-2xl font-bold text-black">Welcome, {vendorName}!</h2>
          <p className="text-gray-600 mb-6">Manage incoming requests and track your queue.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Pending Requests" value={stats.pendingCount} icon={<IconUsers className="h-6 w-6 text-blue-500" />} />
            <StatCard title="In Queue" value={stats.activeCount} icon={<IconClock className="h-6 w-6 text-yellow-500" />} />
            <StatCard title="Completed Today" value={stats.completedToday} icon={<IconCircleCheck className="h-6 w-6 text-green-500" />} />
          </div>

          <div className="flex border-b border-gray-200 mb-6">
            <TabButton
              title="Pending Requests"
              count={pendingCards.length}
              isActive={isPending}
              onClick={() => setActiveTab("pending")}
            />
            <TabButton
              title="Current Queue"
              count={queueCards.length}
              isActive={!isPending}
              onClick={() => setActiveTab("queue")}
            />
          </div>

          <div className="bg-white rounded-lg p-4 md:p-6">
            {cardsToDisplay.length === 0 ? (
              <EmptyState message={isPending ? "No pending requests right now." : "The queue is currently empty."} />
            ) : (
              <ExpandableCardDemo cards={cardsToDisplay} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Helpers ---
const capitalizeWords = (value: string) =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const truncateText = (value: string, length = 120) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

const formatDateTime = (date?: string | null) => {
  if (!date) return "Not set";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
};

const createCard = (token: TokenWithUser, context: "pending" | "queue"): Card => {
  const serviceLabel = capitalizeWords(token.serviceType ?? "service");
  const title = token.subject?.trim() ? token.subject : `${serviceLabel} request`;
  const baseDescription = token.description?.trim() || `Awaiting ${serviceLabel.toLowerCase()} details.`;
  const description = context === "queue"
    ? `Queue position: ${token.queuePosition ?? "N/A"}. ${truncateText(baseDescription)}`
    : truncateText(baseDescription);

  return {
    id: token.id,
    title,
    description,
    ctaText: "View details",
    token,
    component: ProjectProposalReviewContent,
  };
};

// --- Tab Button ---
const TabButton = ({ title, count, isActive, onClick }: { title: string; count: number; isActive: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "py-3 px-4 flex items-center gap-2 font-medium text-sm",
      isActive ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500 hover:text-black"
    )}
  >
    <span>{title}</span>
    <span className={cn("py-0.5 px-2 rounded-full text-xs", isActive ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-700")}>{count}</span>
  </button>
);

// --- Stat Card ---
const StatCard = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-black">{value}</p>
    </div>
    <div className="rounded-full bg-gray-100 p-3">{icon}</div>
  </div>
);

// --- Empty State ---
const EmptyState = ({ message }: { message: string }) => (
  <div className="py-12 text-center text-gray-600">
    <p className="text-sm md:text-base">{message}</p>
  </div>
);

const DashboardLoader = () => (
  <div className="flex flex-1 items-center justify-center py-12">
    <div className="flex items-center space-x-2">
      <span className="sr-only">Loading dashboard</span>
      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" />
    </div>
  </div>
);

// --- Expandable Card Demo ---
function ExpandableCardDemo({ cards }: { cards: Card[] }) {
  const [active, setActive] = useState<Card | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 h-full w-full z-10" />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              key={`button-${active.id}-${id}`}
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
              layoutId={`card-${active.id}-${id}`}
              ref={ref}
              className="w-full max-w-[520px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white text-black sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-start p-4">
                <div>
                  <motion.h3 layoutId={`title-${active.id}-${id}`} className="font-bold text-neutral-800">
                    {active.title}
                  </motion.h3>
                  <motion.p layoutId={`description-${active.id}-${id}`} className="text-neutral-600">
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
                  className="text-neutral-700 text-sm lg:text-base h-auto md:h-fit pb-10 flex flex-col items-start gap-4 overflow-auto"
                >
                  <active.component token={active.token} />
                </motion.div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      <ul className="max-w-none mx-auto w-full gap-4 flex flex-col">
        {cards.map((card) => (
          <motion.div
            layoutId={`card-${card.id}-${id}`}
            key={`card-${card.id}-${id}`}
            onClick={() => setActive(card)}
            className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent"
          >
            <div className="flex gap-4 flex-col md:flex-row">
              <div>
                <motion.h3 layoutId={`title-${card.id}-${id}`} className="font-medium text-neutral-800 text-center md:text-left">
                  {card.title}
                </motion.h3>
                <motion.p layoutId={`description-${card.id}-${id}`} className="text-neutral-600 text-center md:text-left">
                  {card.description}
                </motion.p>
              </div>
            </div>
            <motion.button layoutId={`button-${card.id}-${id}`} className="px-4 py-2 text-sm rounded-full font-bold bg-gray-100 hover:bg-gray-200 text-black mt-4 md:mt-0">
              {card.ctaText}
            </motion.button>
          </motion.div>
        ))}
      </ul>
    </>
  );
}

// --- Close Icon ---
export const CloseIcon = () => (
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

// --- Project Proposal Review Template (dynamic) ---
const ProjectProposalReviewContent = ({ token }: { token: TokenWithUser }) => {
  const serviceLabel = capitalizeWords(token.serviceType ?? "Service");
  const queuePosition = token.queuePosition ? `#${token.queuePosition}` : "Not queued";
  const eta = token.estimatedCompletion ? formatDateTime(token.estimatedCompletion) : "Not available";
  const statusLabel = capitalizeWords(token.status.toLowerCase().replace(/_/g, " "));

  return (
    <div className="w-full">
      <section className="space-y-2">
        <h4 className="text-sm font-bold uppercase text-gray-400">Request Summary</h4>
        <p className="text-sm text-gray-700">
          <strong>Service:</strong> {serviceLabel}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Status:</strong> {statusLabel}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Queue Position:</strong> {queuePosition}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Estimated Completion:</strong> {eta}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Submitted:</strong> {formatDateTime(token.createdAt)}
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h4 className="text-sm font-bold uppercase text-gray-400">User Details</h4>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconMail className="h-4 w-4 text-gray-500" />
            <span className="text-gray-800">{token.user?.email ?? "Email not provided"}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconPhone className="h-4 w-4 text-gray-500" />
            <span className="text-gray-800">Phone not available</span>
          </div>
          <div className="flex items-center gap-2">
            <IconMapPin className="h-4 w-4 text-gray-500" />
            <span className="text-gray-800">Address not provided</span>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <h4 className="text-sm font-bold uppercase text-gray-400">Request Details</h4>
        <p className="text-sm text-gray-700">
          <strong>Subject:</strong> {token.subject || "No subject"}
        </p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {token.description || "No description provided."}
        </p>
        {token.vendorMessage && (
          <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <strong>Vendor Notes:</strong> {token.vendorMessage}
          </p>
        )}
      </section>
    </div>
  );
};

