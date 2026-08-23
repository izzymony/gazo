import Link from "next/link";
import Header from "@/design-system/common/Header";
import Footer from "@/design-system/common/Footer";
import Button from "@/design-system/common/Button";
import { MainLayoutProps } from "@/lib/types";
import Image from "next/image";

export default function MainLayout({
  buttonText,
  btnClass,
  onClickBtn,
  secondaryText,
  secondaryLink,
  imgSrc,
  children,
  headerProps,
  staticContent = false,
  showFooter = false,
  showBtn = false,
  showBeforeBtn = false,
  showDivider = false,
  buttonType = "button",
  otpCheckMailNotification = false,
  isButtonLoading = false,
  beforeButtonContent,
  afterButtonContent,
  addSpace = false,
}: MainLayoutProps) {
  return (
    <>
      {/* Conditionally render Header */}
      {headerProps && <Header {...headerProps} />}
      <div
        className={
          headerProps
            ? "flex flex-col w-full max-w-full lg:max-w-5xl lg:mx-auto h-full lg:mt-3"
            : "flex flex-col w-full max-w-full lg:max-w-5xl lg:mx-auto h-full"
        }>
        {staticContent ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {children}
            </div>
            {/* Buttons Section */}
            {showBtn && (
              <div className={`fixed bottom-0 left-0 right-0 w-full max-w-full lg:max-w-5xl lg:mx-auto pb-5 px-3 bg-white border-t border-gray-100 z-sticky ${btnClass}`}>
                {otpCheckMailNotification && (
                  <p className="text-body text-ink-60 font-normal text-start pb-8">
                    If you haven't received the mail try checking your <br />
                    spam folder or resending it.
                  </p>
                )}

                {showDivider && (
                  <hr className="w-full text-ink-60" />
                )}

                {/* Content Before Button */}
                {showBeforeBtn && (
                  <div className="w-full flex flex-row items-center gap-5 mt-0">
                    <div className="">{beforeButtonContent}</div>

                    {buttonText && (
                      <Button
                        type={buttonType}
                        loading={isButtonLoading}
                        // className="!mt-0"
                        onClick={() => onClickBtn?.()}>
                        {buttonText}
                      </Button>
                    )}
                  </div>
                )}

                {/* Button */}
                {buttonText && !showBeforeBtn && (
                  <Button
                    type={buttonType}
                    loading={isButtonLoading}
                    onClick={() => {
                      console.log(`${buttonText} button clicked`);
                      onClickBtn?.();
                    }}>
                    {buttonText}
                  </Button>
                )}

                {/* Content After Button */}
                {afterButtonContent && (
                  <div className="mt-4">{afterButtonContent}</div>
                )}

                {/* Secondary Text and Link */}
                {secondaryText && secondaryLink && (
                  <Link
                    href={secondaryLink}
                    className="text-brand text-body font-medium w-full text-center py-3 px-6 flex justify-center mt-3">
                    {secondaryText}
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <main className="flex-1 overflow-y-auto scrollbar-hide pb-[100px] mt-2.5">
              {/* Centered Image */}
              <div className="flex flex-col items-center justify-center ">
                {addSpace && <div className="mt-[120px]" />}
                {imgSrc && (
                  <div className="max-w-[296px] mt-[90px] mb-5">
                    <Image
                      src={imgSrc}
                      alt="Welcome"
                      width={"0"}
                      height={"0"}
                      className="w-auto h-auto"
                    />
                  </div>
                )}
              </div>
              {children}
            </main>

            {/* Buttons Section */}
            {showBtn && (
              <div className={`fixed bottom-0 left-0 right-0 w-full max-w-full lg:max-w-5xl lg:mx-auto pb-5 px-3 bg-white border-t border-gray-100 z-sticky ${btnClass}`}>
                {otpCheckMailNotification && (
                  <p className="text-body text-ink-60 font-normal text-start pb-8">
                    If you haven't received the mail try checking your <br />
                    spam folder or resending it.
                  </p>
                )}

                {showDivider && (
                  <hr className="w-full text-ink-60" />
                )}

                {/* Content Before Button */}
                {showBeforeBtn && (
                  <div className="w-full flex flex-row items-center gap-5 mt-0">
                    <div className="">{beforeButtonContent}</div>

                    {buttonText && (
                      <Button
                        type={buttonType}
                        loading={isButtonLoading}
                        // className="!mt-0"
                        onClick={() => onClickBtn?.()}>
                        {buttonText}
                      </Button>
                    )}
                  </div>
                )}

                {/* Button */}
                {buttonText && !showBeforeBtn && (
                  <Button
                    type={buttonType}
                    loading={isButtonLoading}
                    onClick={() => {
                      console.log(`${buttonText} button clicked`);
                      onClickBtn?.();
                    }}>
                    {buttonText}
                  </Button>
                )}

                {/* Content After Button */}
                {afterButtonContent && (
                  <div className="mt-4">{afterButtonContent}</div>
                )}

                {/* Secondary Text and Link */}
                {secondaryText && secondaryLink && (
                  <Link
                    href={secondaryLink}
                    className="text-brand text-body font-medium w-full text-center py-3 px-6 flex justify-center mt-3">
                    {secondaryText}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conditionally render Footer */}
      {showFooter && <Footer />}
    </>
  );
}