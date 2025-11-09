"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconUser,
  IconClipboardList,
  IconClock,
  IconCircleCheck,
  IconMail,
  IconPhone,
  IconMapPin,
  IconPlus, // Added for the new button
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { socket } from "@/services/socket";
import type { Token } from "@/types";
import CreateTokenModal from "@/components/CreateTokenModal";

// Renamed: A user looks at a token associated with a vendor
type TokenWithVendor = Token & {
  vendor?: {
    name: string;
    email: string;
    phoneNumber?: string;
    address?: string;
  };
  completedAt?: string | null; // Added for "previous requests" tab
};

// Updated: Removed activeCount, added completedTotal
type DashboardStats = {
  pendingCount: number;
  completedToday: number;
  completedTotal: number;
};

type Card = {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  token: TokenWithVendor; // Updated type
  component: React.ComponentType<{ 
    token: TokenWithVendor;
    onCancel?: (tokenId: string) => void;
    onDelete?: (tokenId: string) => void;
    isLoading?: boolean;
  }>; // Updated type
  onCancel?: (tokenId: string) => void;
  onDelete?: (tokenId: string) => void;
  isLoading?: boolean;
};

// --- Main User Dashboard Component ---
export function UserDashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Wait for auth to be checked from localStorage
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // UPDATED: Check for "USER" role
    if (isInitialized && (!isAuthenticated || !user || user.role !== "USER")) {
      navigate("/login", { replace: true });
    }
  }, [isInitialized, isAuthenticated, user, navigate]);

  // Show loading while checking auth
  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // If no user after initialization, render nothing (will redirect)
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate("/login", { replace: true });
  };

  // UPDATED: Links for a user
  const links = [
    {
      label: "Profile",
      href: "/user/profile", // Updated href
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
      {/* UPDATED: Component and props */}
      <UserDashboardContent userId={user?.id ?? ""} userName={user?.name ?? "User"} />
    </div>
  );
}

// --- Logo Components (Unchanged) ---
export const Logo = () => (
  <a href="#" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black">
    <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black" />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium whitespace-pre text-black">
      User Menu
    </motion.span>
  </a>
);

export const LogoIcon = () => (
  <a href="#" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black">
    <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black" />
  </a>
);

// --- Main Dashboard Content Component (Renamed and Updated) ---
const UserDashboardContent = ({ userId, userName }: { userId: string; userName: string }) => {
  // UPDATED: Tab state
  const [activeTab, setActiveTab] = useState<"pending" | "previous">("pending");
  const [pending, setPending] = useState<TokenWithVendor[]>([]);
  // RENAMED: from queue to previousRequests
  const [previousRequests, setPreviousRequests] = useState<TokenWithVendor[]>([]);
  // UPDATED: Stats state
  const [stats, setStats] = useState<DashboardStats>({
    pendingCount: 0,
    completedToday: 0,
    completedTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCancel = async (tokenId: string) => {
    setActionLoading(tokenId);
    try {
      await api.cancelToken(tokenId);
      await refreshData({ silent: true });
    } catch (error: any) {
      console.error("Failed to cancel token:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (tokenId: string) => {
    setActionLoading(tokenId);
    try {
      await api.deleteToken(tokenId);
      await refreshData({ silent: true });
    } catch (error: any) {
      console.error("Failed to delete token:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const refreshData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) return;
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
      try {
        // UPDATED: API calls for user
        const [pendingData, historyData, statsData] = await Promise.all([
          api.getUserPending(userId),
          api.getUserHistory(userId), // Changed from getVendorQueue
          api.getUserStats(userId),
        ]);
        // Sort by creation time (oldest first)
        setPending(pendingData.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
        setPreviousRequests(historyData.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )); // Updated state
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load user dashboard data", error);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!userId) return;
    socket.connect();

    const handleRefresh = () => {
      refreshData({ silent: true });
    };

    // UPDATED: Socket events for a user
    socket.on("token.created", handleRefresh); // Refresh when user creates one
    socket.on("token.updated", handleRefresh); // Refresh when vendor updates status
    socket.on("token.cancelled", handleRefresh);

    return () => {
      socket.off("token.created", handleRefresh);
      socket.off("token.updated", handleRefresh);
      socket.off("token.cancelled", handleRefresh);
      socket.disconnect();
    };
  }, [userId, refreshData]);

  const pendingCards = useMemo(
    () => pending.map((token, index) => createCard(token, "pending", handleCancel, handleDelete, actionLoading, index + 1)),
    [pending, actionLoading]
  );
  // RENAMED: from queueCards to previousCards
  const previousCards = useMemo(
    () => previousRequests.map((token, index) => createCard(token, "previous", handleCancel, handleDelete, actionLoading, index + 1)),
    [previousRequests, actionLoading]
  );

  if (!userId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-600">User information missing.</p>
      </div>
    );
  }

  if (loading) {
    return <DashboardLoader />;
  }

  const isPending = activeTab === "pending";
  // UPDATED: Card display logic
  const cardsToDisplay = isPending ? pendingCards : previousCards;

  return (
    <div className="flex flex-1 h-full" id="requests">
      <div className="flex h-full w-full flex-1 flex-col overflow-y-auto">
        {/* UPDATED: Header */}
        <div className="bg-white p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-black">User Dashboard</h1>
        </div>

        <div className="p-4 md:p-10">
          <h2 className="text-2xl font-bold text-black">Welcome, {userName}!</h2>
          <p className="text-gray-600 mb-6">Track your requests and manage your profile.</p>

          {/* UPDATED: Stat cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Pending Requests" value={stats.pendingCount} icon={<IconClock className="h-6 w-6 text-yellow-500" />} />
            <StatCard title="Completed Today" value={stats.completedToday} icon={<IconCircleCheck className="h-6 w-6 text-green-500" />} />
            <StatCard title="Total Completed" value={stats.completedTotal} icon={<IconClipboardList className="h-6 w-6 text-blue-500" />} />
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 mb-6">
            <div className="flex">
              <TabButton
                title="Pending Requests"
                count={pendingCards.length}
                isActive={isPending}
                onClick={() => setActiveTab("pending")}
              />
              {/* UPDATED: Tab for "Previous Requests" */}
              <TabButton
                title="Previous Requests"
                count={previousCards.length}
                isActive={!isPending}
                onClick={() => setActiveTab("previous")}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-medium text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mb-2"
            >
              <IconPlus className="h-4 w-4" />
              Create Request
            </button>
          </div>

          <div className="bg-white rounded-lg p-4 md:p-6">
            {cardsToDisplay.length === 0 ? (
              // UPDATED: Empty state message
              <EmptyState message={isPending ? "You have no pending requests." : "No previous requests found."} />
            ) : (
              <ExpandableCardDemo cards={cardsToDisplay} />
            )}
          </div>
        </div>
      </div>
      
      {showCreateModal && (
        <CreateTokenModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refreshData({ silent: false });
          }}
        />
      )}
    </div>
  );
};

// --- Helpers (Unchanged) ---
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

// --- createCard (Updated) ---
const createCard = (
  token: TokenWithVendor, 
  context: "pending" | "previous",
  onCancel?: (tokenId: string) => void,
  onDelete?: (tokenId: string) => void,
  loadingTokenId?: string | null,
  position?: number
): Card => {
  const serviceLabel = capitalizeWords(token.serviceType ?? "service");
  const title = token.subject?.trim() ? token.subject : `${serviceLabel} request`;
  const baseDescription = token.description?.trim() || `Awaiting ${serviceLabel.toLowerCase()} details.`;

  // UPDATED: Description logic for pending vs previous with position number
  let description;
  if (context === "pending") {
    const positionText = position ? `#${position}` : `Queue position: ${token.queuePosition ?? "N/A"}`;
    description = `${positionText}. ${truncateText(baseDescription)}`;
  } else {
    const positionText = position ? `#${position}` : "";
    const completedDate = token.completedAt ? formatDateTime(token.completedAt) : "N/A";
    description = `${positionText ? positionText + ". " : ""}Completed: ${completedDate}. ${truncateText(baseDescription)}`;
  }

  const canCancel = context === "pending" && (token.status === "PENDING" || token.status === "QUEUED" || token.status === "IN_PROGRESS");
  const canDelete = context === "previous";

  return {
    id: token.id,
    title,
    description,
    ctaText: "View details",
    token,
    component: ProjectProposalReviewContent, // This component is now used for vendor details
    onCancel: canCancel ? onCancel : undefined,
    onDelete: canDelete ? onDelete : undefined,
    isLoading: loadingTokenId === token.id,
  };
};

// --- Tab Button (Unchanged) ---
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

// --- Stat Card (Unchanged) ---
const StatCard = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-black">{value}</p>
    </div>
    <div className="rounded-full bg-gray-100 p-3">{icon}</div>
  </div>
);

// --- Empty State (Unchanged) ---
const EmptyState = ({ message }: { message: string }) => (
  <div className="py-12 text-center text-gray-600">
    <p className="text-sm md:text-base">{message}</p>
  </div>
);

// --- DashboardLoader (Unchanged) ---
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

// --- Expandable Card Demo (Unchanged) ---
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
                <div className="flex items-start gap-3 flex-1">
                  {/* Status indicator in modal */}
                  {(active.token.status === "COMPLETED" || active.token.status === "REJECTED" || active.token.status === "CANCELLED") && (
                    <div className="mt-1.5">
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          active.token.status === "COMPLETED" ? "bg-green-500" :
                          active.token.status === "REJECTED" ? "bg-red-500" :
                          "bg-gray-500"
                        }`}
                        title={
                          active.token.status === "COMPLETED" ? "Completed" :
                          active.token.status === "REJECTED" ? "Cancelled by vendor" :
                          "Cancelled by you"
                        }
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <motion.h3 layoutId={`title-${active.id}-${id}`} className="font-bold text-neutral-800">
                      {active.title}
                    </motion.h3>
                    <motion.p layoutId={`description-${active.id}-${id}`} className="text-neutral-600">
                      {active.description}
                    </motion.p>
                  </div>
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
                  <active.component 
                    token={active.token} 
                    onCancel={active.onCancel}
                    onDelete={active.onDelete}
                    isLoading={active.isLoading}
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      <ul className="max-w-none mx-auto w-full gap-4 flex flex-col">
        {cards.map((card) => {
          // Determine status indicator color
          let statusDotColor = "";
          let statusLabel = "";
          if (card.token.status === "COMPLETED") {
            statusDotColor = "bg-green-500";
            statusLabel = "Completed";
          } else if (card.token.status === "REJECTED") {
            statusDotColor = "bg-red-500";
            statusLabel = "Cancelled by vendor";
          } else if (card.token.status === "CANCELLED") {
            statusDotColor = "bg-gray-500";
            statusLabel = "Cancelled by you";
          }

          return (
            <motion.div
              layoutId={`card-${card.id}-${id}`}
              key={`card-${card.id}-${id}`}
              onClick={() => setActive(card)}
              className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent"
            >
              <div className="flex gap-4 flex-col md:flex-row items-center md:items-start w-full md:w-auto">
                {statusDotColor && (
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className={`w-3 h-3 rounded-full ${statusDotColor}`}
                      title={statusLabel}
                    />
                  </div>
                )}
                <div className="flex-1">
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
          );
        })}
      </ul>
    </>
  );
}

// --- Close Icon (Unchanged) ---
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

// --- Project Proposal Review Content (Updated) ---
const ProjectProposalReviewContent = ({ 
  token, 
  onCancel, 
  onDelete, 
  isLoading 
}: { 
  token: TokenWithVendor;
  onCancel?: (tokenId: string) => void;
  onDelete?: (tokenId: string) => void;
  isLoading?: boolean;
}) => {
  const [timeDisplay, setTimeDisplay] = React.useState<string>("");

  React.useEffect(() => {
    // Timer for IN_PROGRESS or QUEUED status showing remaining time
    if (token.status !== "IN_PROGRESS" && token.status !== "QUEUED") return;
    if (!token.estimatedCompletion) return;

    const updateTimer = () => {
      const now = Date.now();
      const endTime = new Date(token.estimatedCompletion!).getTime();
      const diff = endTime - now;
      
      if (diff <= 0) {
        setTimeDisplay("Overdue");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeDisplay(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [token.status, token.estimatedCompletion]);

  const serviceLabel = capitalizeWords(token.serviceType ?? "Service");
  const queuePosition = token.queuePosition ? `#${token.queuePosition}` : "Not queued";
  const eta = token.estimatedCompletion ? formatDateTime(token.estimatedCompletion) : "Not available";
  const statusLabel = capitalizeWords(token.status.toLowerCase().replace(/_/g, " "));
  const isActive = token.status === "QUEUED" || token.status === "IN_PROGRESS";

  return (
    <div className="w-full">
      {timeDisplay && isActive && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-700">
            <IconClock className="inline h-4 w-4 mr-1" />
            Time Remaining: {timeDisplay}
          </p>
        </div>
      )}

      {/* Status badge for completed/cancelled requests */}
      {(token.status === "COMPLETED" || token.status === "REJECTED" || token.status === "CANCELLED") && (
        <div className={`mb-4 p-3 rounded-lg border ${
          token.status === "COMPLETED" ? "bg-green-50 border-green-200" :
          token.status === "REJECTED" ? "bg-red-50 border-red-200" :
          "bg-gray-50 border-gray-200"
        }`}>
          <p className={`text-sm font-semibold ${
            token.status === "COMPLETED" ? "text-green-700" :
            token.status === "REJECTED" ? "text-red-700" :
            "text-gray-700"
          }`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              token.status === "COMPLETED" ? "bg-green-500" :
              token.status === "REJECTED" ? "bg-red-500" :
              "bg-gray-500"
            }`}></span>
            {token.status === "COMPLETED" ? "Request Completed" :
             token.status === "REJECTED" ? "Cancelled by Vendor" :
             "Cancelled by You"}
          </p>
        </div>
      )}

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

      {/* UPDATED: Changed from User Details to Vendor Details */}
      <section className="mt-6 space-y-2">
        <h4 className="text-sm font-bold uppercase text-gray-400">Vendor Details</h4>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconUser className="h-4 w-4 text-gray-500" />
            <span className="text-gray-800">{token.vendor?.name ?? "Vendor name not available"}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconMail className="h-4 w-4 text-gray-500" />
            <span className="text-gray-800">{token.vendor?.email ?? "Email not provided"}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconPhone className="h-4 w-4 text-gray-500" />
            <span className="text-gray-800">{token.vendor?.phoneNumber ?? "Phone not available"}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconMapPin className="h-4 w-4 text-gray-500" />
            <span className="text-gray-800">{token.vendor?.address ?? "Address not provided"}</span>
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
          <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-md p-3">
            <strong>Message from Vendor:</strong> {token.vendorMessage}
          </p>
        )}
      </section>

      {/* Action buttons section */}
      {onCancel && (
        <section className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => onCancel(token.id)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Cancel Request"}
          </button>
        </section>
      )}

      {onDelete && (
        <section className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => onDelete(token.id)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Delete from History"}
          </button>
        </section>
      )}
    </div>
  );
};