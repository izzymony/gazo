/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect } from "react";
import Selling from "@/features/seller-dashboard/selling";
import Buying from "@/features/seller-dashboard/buying";
import VendorNav from "@/features/storefront/VendorNav";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import Image from "next/image";
import H1 from "@/design-system/common/Typography";
import ModeSwitch from "@/design-system/common/ModeSwitch";
import Dialog from "@/design-system/common/Dialog";
import { toast } from "sonner";
import {
  ChevronRight,
  X,
  Store,
  Edit,
  FaLocationDot,
  CreditCard,
  Settings,
  HelpSquare,
  Logout,
  CircleCheck,
} from "@/design-system/icons";

const MenuItem = ({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) => (
  <div
    onClick={onClick}
    className={`flex justify-between items-center text-body font-medium px-3 py-3 rounded-field cursor-pointer transition-colors active:bg-ink-5 ${
      danger ? "text-brand" : "text-ink-90"
    }`}>
    <div className="flex gap-3 items-center">
      {Icon}
      <p>{label}</p>
    </div>
    <ChevronRight size={20} className={danger ? "text-brand" : "text-ink-40"} />
  </div>
);

const Page = () => {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { unreadCount } = useNotificationCount("buyer");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalTwoOpen, setIsModalTwoOpen] = useState(false);
  const [isNavigatingToSignin, setIsNavigatingToSignin] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const openModalTwo = () => setIsModalTwoOpen(true);
  const closeModalTwo = () => setIsModalTwoOpen(false);

  const handleSigninNavigation = async () => {
    if (isNavigatingToSignin) return;
    setIsNavigatingToSignin(true);
    setTimeout(() => {
      router.push("/signin");
    }, 100);
  };

  // Event listener for ModeSwitch business creation trigger
  useEffect(() => {
    const handleOpenSellerModal = () => {
      setIsModalTwoOpen(true);
    };

    window.addEventListener('openSellerModal', handleOpenSellerModal);

    return () => {
      window.removeEventListener('openSellerModal', handleOpenSellerModal);
    };
  }, []);

  return (
    <>
      <PageShell
        header={
          <Header
            showBack
            showMenu
            isMenu={false}
            customText="Profile"
            handleMenu={openModal}
            showNotification={!!user}
            notificationCount={unreadCount}
            onNotificationClick={() => router.push("/notification")}
            onBackClick={() => {
              router.push("/shop");
            }}
          />
        }>
        <div className="pb-28">
          {!user ? (
            <div className="min-h-[70vh] flex flex-col justify-center items-center gap-5">
              <Image
                alt="Vibaar"
                width={0}
                height={0}
                src="/Logo (6).svg"
                className="max-w-[160px] w-full h-auto mx-auto"
              />
              <div className="text-center mt-5 flex flex-col gap-2">
                <H1 className="text-h2 mb-1 leading-[22px]">
                  Sign in to your account
                </H1>
                <p className="text-ink-60 mt-3 max-w-[320px]">
                  To continue enjoying Vibaar’s features you need to sign in
                  to your account.
                </p>
              </div>

              <div className="w-full">
                <Button
                  onClick={handleSigninNavigation}
                  loading={isNavigatingToSignin}
                  loadingText="Loading sign in..."
                  className="mt-4"
                >
                  Sign in
                </Button>
              </div>
              <p className="text-body mt-3 text-center text-ink-60">
                Don’t have an account?{" "}
                <span
                  className="text-brand ml-2 cursor-pointer"
                  onClick={() => router.push("/signup")}>
                  Sign up
                </span>
              </p>
            </div>
          ) : (
            <Buying />
          )}
        </div>
      </PageShell>
      <VendorNav />
      <ModeSwitch />

      {isModalOpen && (
          <Dialog
            isOpen={isModalOpen}
            onClose={closeModal}
            ariaLabel="Menu"
            className="rounded-t-card md:rounded-card md:max-w-md py-5 px-1 md:px-4 md:py-5 lg:py-6 shadow-pop md:shadow-pop relative"
          >
              {/* Close button - positioned absolutely, hidden on mobile */}
              <button
                onClick={closeModal}
                className="hidden md:flex absolute top-3 right-3 md:top-4 md:right-4 lg:top-5 lg:right-5 w-8 h-8 items-center justify-center rounded-full hover:bg-ink-5 transition-colors z-10"
                aria-label="Close modal"
              >
                <X size={20} className="text-ink-60" />
              </button>

              <h2 className="text-body md:text-body-lg font-medium text-center">Menu</h2>
              <div className="my-4 space-y-3">
                {!user?.business?.id && (
                  <MenuItem
                    icon={<Store size={22} />}
                    label="Become a seller"
                    onClick={openModalTwo}
                  />
                )}
                <MenuItem
                  icon={<Edit size={20} />}
                  label="Edit profile"
                  onClick={() => router.push("/profile/edit-profile")}
                />
                <MenuItem
                  icon={<FaLocationDot size={20} />}
                  label="My shipping Address"
                  onClick={() => router.push("/profile/shipping-address")}
                />
                <MenuItem
                  icon={<CreditCard size={20} />}
                  label="Payment details"
                  onClick={() => toast("Payment methods coming soon", { icon: "🔜" })}
                />
                <MenuItem
                  icon={<Settings size={20} />}
                  label="Settings"
                  onClick={() => router.push("/profile/settings")}
                />
                <MenuItem
                  icon={<HelpSquare size={20} />}
                  label="Help and support"
                  onClick={() => router.push("/profile/support")}
                />
                <MenuItem
                  icon={<Logout size={20} />}
                  label="Log out"
                  danger
                  onClick={() => logout(() => router.push("/signin"))}
                />
              </div>
        </Dialog>
        )}


      {isModalTwoOpen && (
          <div
            onClick={closeModalTwo}
            className="fixed inset-0 z-modal flex items-end justify-center bg-black/50 w-full ">
            <div className="bg-white rounded-t-card w-full px-8 py-10 shadow-pop flex flex-col">
              <p className="text-center mt-10 text-display font-medium mb-2 tracking-[0.5px] leading-[34px]">
                Transform Your <br />
                Passion into Profit
              </p>
              <p className="text-center text-body font-normal mb-5">
                Join the community of successful <br /> sellers on Vibaar
                today!
              </p>

              <div className="flex justify-center items-center my-5">
                <svg
                  width="198"
                  height="198"
                  viewBox="0 0 198 198"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M91.7273 189.91C141.935 189.91 182.636 149.209 182.636 99.0009C182.636 48.7932 141.935 8.0918 91.7273 8.0918C41.5196 8.0918 0.818237 48.7932 0.818237 99.0009C0.818237 149.209 41.5196 189.91 91.7273 189.91Z"
                    fill="#E9FFFE"
                  />
                  <path
                    d="M151.727 26.2723C151.726 26.608 151.632 26.9369 151.456 27.2226C151.279 27.5082 151.027 27.7394 150.727 27.8904C148.63 28.9341 146.76 30.3823 145.225 32.1515C143.69 33.9208 142.52 35.9762 141.782 38.1995L140.818 41.3995C140.699 41.7633 140.467 42.08 140.157 42.3046C139.847 42.5291 139.474 42.65 139.091 42.65C138.708 42.65 138.335 42.5291 138.025 42.3046C137.715 42.08 137.483 41.7633 137.364 41.3995L136.309 38.1995C135.571 35.9762 134.401 33.9208 132.866 32.1515C131.331 30.3823 129.461 28.9341 127.364 27.8904C127.066 27.7379 126.816 27.5061 126.641 27.2205C126.467 26.935 126.375 26.6069 126.375 26.2723C126.375 25.9376 126.467 25.6095 126.641 25.324C126.816 25.0385 127.066 24.8067 127.364 24.6541C129.461 23.6104 131.331 22.1623 132.866 20.393C134.401 18.6237 135.571 16.5683 136.309 14.345L137.364 11.145C137.483 10.7812 137.715 10.4645 138.025 10.24C138.335 10.0154 138.708 9.89453 139.091 9.89453C139.474 9.89453 139.847 10.0154 140.157 10.24C140.467 10.4645 140.699 10.7812 140.818 11.145L141.873 14.345C142.61 16.5683 143.781 18.6237 145.316 20.393C146.851 22.1623 148.721 23.6104 150.818 24.6541C151.101 24.8173 151.335 25.0537 151.495 25.3384C151.655 25.6232 151.735 25.9457 151.727 26.2723ZM57.1819 177.181C57.1809 177.517 57.0869 177.846 56.9104 178.132C56.7339 178.417 56.4817 178.648 56.1819 178.8C54.0848 179.843 52.2147 181.291 50.6795 183.061C49.1443 184.83 47.9741 186.885 47.2364 189.109L46.2728 192.309C46.1532 192.672 45.9219 192.989 45.6117 193.214C45.3016 193.438 44.9284 193.559 44.5455 193.559C44.1626 193.559 43.7895 193.438 43.4793 193.214C43.1692 192.989 42.9378 192.672 42.8183 192.309L41.7637 189.109C41.026 186.885 39.8559 184.83 38.3207 183.061C36.7854 181.291 34.9154 179.843 32.8183 178.8C32.5204 178.647 32.2705 178.415 32.096 178.13C31.9215 177.844 31.8291 177.516 31.8291 177.181C31.8291 176.847 31.9215 176.519 32.096 176.233C32.2705 175.948 32.5204 175.716 32.8183 175.563C34.9154 174.52 36.7854 173.071 38.3207 171.302C39.8559 169.533 41.026 167.477 41.7637 165.254L42.8183 162.054C42.9378 161.69 43.1692 161.374 43.4793 161.149C43.7895 160.925 44.1626 160.804 44.5455 160.804C44.9284 160.804 45.3016 160.925 45.6117 161.149C45.9219 161.374 46.1532 161.69 46.2728 162.054L47.3274 165.254C48.065 167.477 49.2352 169.533 50.7704 171.302C52.3057 173.071 54.1757 174.52 56.2728 175.563C56.5557 175.726 56.7894 175.963 56.9494 176.248C57.1094 176.532 57.1897 176.855 57.1819 177.181Z"
                    fill="#FFCC00"
                  />
                  <path
                    d="M26.2728 11.7275C29.2852 11.7275 31.7273 9.28537 31.7273 6.2729C31.7273 3.26044 29.2852 0.818359 26.2728 0.818359C23.2603 0.818359 20.8182 3.26044 20.8182 6.2729C20.8182 9.28537 23.2603 11.7275 26.2728 11.7275Z"
                    fill="#06C270"
                  />
                  <path
                    d="M191.727 30.0556C194.74 30.0556 197.182 27.6135 197.182 24.601C197.182 21.5886 194.74 19.1465 191.727 19.1465C188.715 19.1465 186.273 21.5886 186.273 24.601C186.273 27.6135 188.715 30.0556 191.727 30.0556Z"
                    fill="#C90027"
                  />
                  <path
                    d="M186.273 169.909C189.285 169.909 191.727 167.467 191.727 164.455C191.727 161.442 189.285 159 186.273 159C183.26 159 180.818 161.442 180.818 164.455C180.818 167.467 183.26 169.909 186.273 169.909Z"
                    fill="#0063F7"
                  />
                  <path
                    d="M9.90914 197.183C12.9216 197.183 15.3637 194.74 15.3637 191.728C15.3637 188.716 12.9216 186.273 9.90914 186.273C6.89667 186.273 4.45459 188.716 4.45459 191.728C4.45459 194.74 6.89667 197.183 9.90914 197.183Z"
                    fill="#02A29E"
                  />
                  <path
                    d="M168.091 119.292L151.273 167.674C144.978 173.142 137.961 177.718 130.418 181.274L24.6728 144.583C23.3187 144.1 22.0985 143.302 21.1124 142.256C20.1263 141.21 19.4024 139.945 19 138.565L8.29095 102.201C7.73269 100.374 7.76422 98.4173 8.38108 96.6092C8.99794 94.801 10.1688 93.2332 11.7273 92.1282L42.6364 70.1646C43.8176 69.3292 45.1812 68.7879 46.6137 68.5855C48.0462 68.3831 49.5064 68.5255 50.8728 69.0009L162.455 107.71C163.586 108.099 164.631 108.707 165.527 109.5C166.423 110.292 167.154 111.254 167.678 112.331C168.201 113.407 168.507 114.575 168.578 115.77C168.649 116.965 168.484 118.161 168.091 119.292Z"
                    fill="#D43252"
                  />
                  <path
                    d="M189.909 68.0909V129.909C189.909 132.32 188.951 134.632 187.246 136.337C185.542 138.042 183.229 139 180.818 139H39.1091C37.6654 138.998 36.2428 138.653 34.9591 137.992C33.6754 137.331 32.5676 136.374 31.7273 135.2L9.65458 104.291C8.55014 102.748 7.9563 100.898 7.9563 99C7.9563 97.1023 8.55014 95.2523 9.65458 93.7091L31.7273 62.8C32.5676 61.6259 33.6754 60.6689 34.9591 60.0081C36.2428 59.3473 37.6654 59.0017 39.1091 59H180.818C183.229 59 185.542 59.9578 187.246 61.6627C188.951 63.3675 189.909 65.6799 189.909 68.0909Z"
                    fill="#FF4E71"
                  />
                  <path
                    d="M37.1819 98.9996C37.1819 100.928 36.4157 102.778 35.0518 104.142C33.6879 105.506 31.838 106.272 29.9092 106.272C29.4515 106.277 28.9945 106.234 28.5455 106.145C26.8814 105.83 25.3795 104.943 24.2991 103.639C23.2187 102.334 22.6274 100.693 22.6274 98.9996C22.6274 97.3058 23.2187 95.6651 24.2991 94.3606C25.3795 93.0561 26.8814 92.1696 28.5455 91.8542C28.9945 91.7651 29.4515 91.7224 29.9092 91.7269C31.838 91.7269 33.6879 92.4931 35.0518 93.857C36.4157 95.2209 37.1819 97.0708 37.1819 98.9996Z"
                    fill="#D43252"
                  />
                  <path
                    d="M28.5455 91.8538C27.2695 92.1003 26.0829 92.6842 25.1091 93.5447C25.96 94.1948 26.665 95.0161 27.1787 95.9557C27.6923 96.8953 28.0031 97.9321 28.0909 98.9993C28.0031 100.066 27.6923 101.103 27.1787 102.043C26.665 102.982 25.96 103.804 25.1091 104.454C21.7591 107.103 17.8571 108.967 13.6909 109.908C9.77289 110.938 5.75628 111.548 1.70911 111.727C1.87274 112.927 2.05456 114.127 2.27274 115.363C6.89068 115.186 11.4699 114.447 15.9091 113.163C20.6782 111.991 25.0628 109.604 28.6364 106.236C29.6373 105.334 30.4376 104.232 30.9854 103.001C31.5332 101.77 31.8162 100.438 31.8162 99.0902C31.8162 97.7429 31.5332 96.4106 30.9854 95.1797C30.4376 93.9487 29.6373 92.8466 28.6364 91.9447L28.5455 91.8538ZM15.9091 84.9266C11.4699 83.6421 6.89068 82.9033 2.27274 82.7266C2.05456 83.9266 1.87274 85.1266 1.70911 86.3629C5.75301 86.512 9.76957 87.091 13.6909 88.0902L15.9091 84.9266Z"
                    fill="#FF0032"
                  />
                  <path
                    d="M65.7274 119.441C62.3916 119.441 59.4825 118.704 57.0001 117.23C54.5565 115.756 52.8304 113.952 51.8219 111.819C51.3952 110.888 51.1819 110.132 51.1819 109.55C51.1819 108.735 51.4728 108.057 52.0546 107.514C52.6365 106.932 53.3346 106.641 54.1492 106.641C54.8474 106.641 55.4486 106.835 55.9528 107.223C56.4571 107.611 56.8255 108.134 57.0583 108.794C57.6789 110.461 58.8231 111.741 60.491 112.634C62.1589 113.526 63.9431 113.972 65.8437 113.972C68.2486 113.972 70.2268 113.409 71.7783 112.285C73.3686 111.121 74.1637 109.705 74.1637 108.037C74.1637 106.757 73.5237 105.594 72.2437 104.546C71.0025 103.499 68.8692 102.549 65.8437 101.695C61.9261 100.609 58.8425 99.213 56.5928 97.5063C54.3431 95.7609 53.2183 93.3754 53.2183 90.35C53.2183 88.2942 53.7613 86.4712 54.8474 84.8809C55.9722 83.2518 57.5625 81.9912 59.6183 81.0991C61.674 80.2069 64.0789 79.7609 66.8328 79.7609C70.7892 79.7609 73.8922 80.5366 76.1419 82.0882C78.4304 83.6397 79.5746 85.7148 79.5746 88.3136C79.5746 89.1669 79.3031 89.8845 78.7601 90.4663C78.2171 91.0482 77.5383 91.3391 76.7237 91.3391C76.0255 91.3391 75.4243 91.1063 74.9201 90.6409C74.4158 90.1754 74.1249 89.5936 74.0474 88.8954C73.8922 87.8094 73.1746 86.9172 71.8946 86.2191C70.6146 85.4821 68.9274 85.1136 66.8328 85.1136C64.234 85.1136 62.2558 85.5597 60.8983 86.4518C59.5407 87.3051 58.8619 88.4688 58.8619 89.9427C58.8619 91.3003 59.5601 92.4445 60.9565 93.3754C62.3528 94.3063 64.6413 95.2372 67.8219 96.1682C71.7395 97.293 74.7068 98.8057 76.7237 100.706C78.7407 102.607 79.7492 104.954 79.7492 107.746C79.7492 109.918 79.1092 111.897 77.8292 113.681C76.5492 115.465 74.8231 116.881 72.651 117.928C70.5177 118.937 68.2098 119.441 65.7274 119.441ZM89.3433 119.092C88.5287 119.092 87.8305 118.82 87.2487 118.277C86.7057 117.695 86.4342 116.997 86.4342 116.183V83.0191C86.4342 82.2045 86.7057 81.5257 87.2487 80.9827C87.8305 80.4009 88.5287 80.11 89.3433 80.11H112.558C113.372 80.11 114.051 80.4009 114.594 80.9827C115.137 81.5257 115.409 82.2045 115.409 83.0191C115.409 83.8336 115.137 84.5318 114.594 85.1136C114.051 85.6566 113.372 85.9282 112.558 85.9282H92.1942V95.9354H109.881C110.696 95.9354 111.375 96.2069 111.918 96.75C112.461 97.293 112.732 97.9718 112.732 98.7863C112.732 99.6009 112.461 100.299 111.918 100.881C111.375 101.424 110.696 101.695 109.881 101.695H92.1942V113.274H112.441C113.256 113.274 113.935 113.565 114.478 114.146C115.021 114.689 115.292 115.368 115.292 116.183C115.292 116.997 115.021 117.695 114.478 118.277C113.935 118.82 113.256 119.092 112.441 119.092H89.3433ZM124.065 119.383C123.328 119.421 122.668 119.15 122.086 118.568C121.505 117.986 121.214 117.327 121.214 116.59V82.67C121.214 81.8942 121.485 81.2348 122.028 80.6918C122.61 80.11 123.308 79.8191 124.123 79.8191C124.899 79.8191 125.558 80.11 126.101 80.6918C126.683 81.2348 126.974 81.8942 126.974 82.67V113.506L142.799 112.459C143.614 112.42 144.293 112.672 144.836 113.215C145.379 113.72 145.65 114.398 145.65 115.252C145.65 115.95 145.379 116.609 144.836 117.23C144.331 117.812 143.73 118.122 143.032 118.161L124.065 119.383ZM154.185 119.383C153.448 119.421 152.789 119.15 152.207 118.568C151.625 117.986 151.334 117.327 151.334 116.59V82.67C151.334 81.8942 151.606 81.2348 152.149 80.6918C152.731 80.11 153.429 79.8191 154.243 79.8191C155.019 79.8191 155.678 80.11 156.221 80.6918C156.803 81.2348 157.094 81.8942 157.094 82.67V113.506L172.92 112.459C173.734 112.42 174.413 112.672 174.956 113.215C175.499 113.72 175.771 114.398 175.771 115.252C175.771 115.95 175.499 116.609 174.956 117.23C174.452 117.812 173.851 118.122 173.152 118.161L154.185 119.383Z"
                    fill="white"
                  />
                </svg>
              </div>

              <div className="py-3 px-4 bg-brand/10 border-[0.5px] border-brand rounded-card w-full my-3 gap-3 flex flex-col">
                {[
                  "Reach Millions of Shoppers",
                  "Easy Product Listing",
                  "Secure and Fast Payments",
                  "Boost Your Visibility",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-2 items-center font-medium text-body text-ink-90">
                    <CircleCheck size={18} className="text-brand" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => router.push("/dashboard/storefront/create?step=1")}
                className="mt-10 w-full py-1">
                Start Selling
              </Button>
            </div>
          </div>
        )}
    </>
  );
};

export default Page;
