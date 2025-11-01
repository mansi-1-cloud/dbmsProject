"use client";

// Imports from SidebarDemo
import React, { useState, useEffect, useId, useRef } from "react"; // Added React hooks
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
  // Added icons to match the video example
  IconMail,
  IconPhone,
  IconMapPin,
  IconFileDescription,
  IconFileSpreadsheet,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react"; // Added AnimatePresence
import { cn } from "@/lib/utils";

// Imports from ExpandableCardDemo
import { useOutsideClick } from "@/hooks/use-outside-click";

// --- Define Card Type ---
type Card = {
  description: string;
  title: string;
  src: string;
  ctaText: string; // We'll use this for the "View Details" button
  ctaLink: string; // This might not be used, but we'll keep it for flexibility
  component: React.ComponentType; // This will hold our custom component
};

// --- Main Component ---
export function CombinedDashboard() {
  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Profile",
      href: "#",
      icon: (
        <IconUserBolt className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800",
        "h-screen",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Manu Arora",
                href: "#",
                icon: (
                  <img
                    src="https://assets.aceternity.com/manu.png"
                    className="h-7 w-7 shrink-0 rounded-full"
                    width={50}
                    height={50}
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <Dashboard />
    </div>
  );
}

// --- Logo Components (from SidebarDemo) ---
export const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        Acet Labs
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
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};

// --- Modified Dashboard Component ---
const Dashboard = () => {
  return (
    <div className="flex flex-1">
      <div className="flex h-full w-full flex-1 flex-col gap-2 rounded-tl-2xl border border-neutral-200 bg-white p-2 md:p-10 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="h-full w-full overflow-y-auto">
          {/* We render the ExpandableCardDemo here */}
          <ExpandableCardDemo />
        </div>
      </div>
    </div>
  );
};

// --- ExpandableCardDemo Component (Modified) ---
function ExpandableCardDemo() {
  const [active, setActive] = useState<Card | boolean | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(false);
      }
    }
    if (active && typeof active === "object") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
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
            className="fixed inset-0 bg-black/20 h-full w-full z-10"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && typeof active === "object" ? (
          <div className="fixed inset-0  grid place-items-center z-[100]">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
                transition: {
                  duration: 0.05,
                },
              }}
              className="flex absolute top-2 right-2 lg:hidden items-center justify-center bg-white rounded-full h-6 w-6"
              onClick={() => setActive(null)}
            >
              <CloseIcon />
            </motion.button>
            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-[500px]  h-full md:h-fit md:max-h-[90%]  flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden"
            >
              {/* We remove the image from the expanded card to match the video */}
              {/*
              <motion.div layoutId={`image-${active.title}-${id}`}>
                <img
                  width={200}
                  height={200}
                  src={active.src}
                  alt={active.title}
                  className="w-full h-80 lg:h-80 sm:rounded-tr-lg sm:rounded-tl-lg object-cover object-top"
                />
              </motion.div>
              */}

              <div>
                <div className="flex justify-between items-start p-4">
                  <div className="">
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-bold text-neutral-700 dark:text-neutral-200"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.description}-${id}`}
                      className="text-neutral-600 dark:text-neutral-400"
                    >
                      {active.description}
                    </motion.p>
                  </div>

                  {/* Removed the green "Play" button from the expanded view to match the video */}
                </div>
                <div className="pt-4 relative px-4">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-neutral-600 text-xs md:text-sm lg:text-base h-auto md:h-fit pb-10 flex flex-col items-start gap-4 overflow-auto dark:text-neutral-400"
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
      <ul className="max-w-2xl mx-auto w-full gap-4">
        {cards.map((card, index) => (
          <motion.div
            layoutId={`card-${card.title}-${id}`}
            key={`card-${card.title}-${id}`}
            onClick={() => setActive(card)}
            className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
          >
            <div className="flex gap-4 flex-col md:flex-row ">
              {/* We can hide the image on the list view to match the video */}
              {/*
              <motion.div layoutId={`image-${card.title}-${id}`}>
                <img
                  width={100}
                  height={100}
                  src={card.src}
                  alt={card.title}
                  className="h-40 w-40 md:h-14 md:w-14 rounded-lg object-cover object-top"
                />
              </motion.div>
              */}
              <div className="">
                <motion.h3
                  layoutId={`title-${card.title}-${id}`}
                  className="font-medium text-neutral-800 dark:text-neutral-200 text-center md:text-left"
                >
                  {card.title}
                </motion.h3>
                <motion.p
                  layoutId={`description-${card.description}-${id}`}
                  className="text-neutral-600 dark:text-neutral-400 text-center md:text-left"
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

// --- CloseIcon Component ---
export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.05,
        },
      }}
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

// --- Custom Content Components ---

// NEW: This component mimics the content from your video
const ProjectProposalReviewContent = () => {
  return (
    <div className="w-full">
      <h4 className="text-sm font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-4">
        User Details
      </h4>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <IconMail className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
          <span className="text-neutral-700 dark:text-neutral-200">
            john.anderson@example.com
          </span>
        </div>
        <div className="flex items-center gap-2">
          <IconPhone className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
          <span className="text-neutral-700 dark:text-neutral-200">
            +1 (555) 123-4567
          </span>
        </div>
        <div className="flex items-center gap-2">
          <IconMapPin className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
          <span className="text-neutral-700 dark:text-neutral-200">
            123 Business Street, New York, NY 10001
          </span>
        </div>
      </div>

      <h4 className="text-sm font-bold uppercase text-neutral-500 dark:text-neutral-400 mt-8 mb-4">
        Attached Files (3)
      </h4>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-800">
          <IconFileDescription className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              Budget_2024.pdf
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              PDF • 2.3 MB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-800">
          <IconFileSpreadsheet className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              Financial_Report.xlsx
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Excel • 1.8 MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// This is the old content, we can keep it for the other cards
const LanaDelReyContent = () => {
  return (
    <p>
      Lana Del Rey, an iconic American singer-songwriter, is celebrated for her
      melancholic and cinematic music style. Born Elizabeth Woolridge Grant in
      New York City, she has captivated audiences worldwide with her haunting
      voice and introspective lyrics. <br /> <br /> Her songs often explore
      themes of tragic romance, glamour, and melancholia, drawing inspiration
      from both contemporary and vintage pop culture.
    </p>
  );
};

// --- cards Data (Updated) ---
const cards: Card[] = [
  {
    // This first card now matches your video
    description: "Annual budget proposal and financial documents",
    title: "Project Proposal Review",
    src: "https://assets.aceternity.com/demos/lana-del-rey.jpeg", // (we can ignore this src since we're hiding it)
    ctaText: "View Details",
    ctaLink: "#",
    component: ProjectProposalReviewContent, // Here is the new component
  },
  {
    // The other cards still use the old content for demo purposes
    description: "Lana Del Rey",
    title: "Summertime Sadness",
    src: "https://assets.aceternity.com/demos/lana-del-rey.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    component: LanaDelReyContent,
  },
];


