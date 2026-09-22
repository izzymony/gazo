import Link from "next/link";

/**
 * The consent line under the auth entry actions.
 *
 * Sized responsively because it now serves both breakpoints: it was the mobile
 * block only, and desktop carried a fourth inline copy at text-body-sm. Keeping
 * caption at every width would have shrunk the desktop consent text to 10px.
 */
const Footer = () => {
  return (
    <div className="mx-auto w-full max-w-[320px] px-5 pb-2.5 text-center md:max-w-none">
      <p className="text-caption font-normal text-foreground-muted md:text-body-sm">
        By continuing, I agree to Vibaar&apos;s {" "}
        <Link href={"/terms"} className="text-brandDeep">
          Terms of service
        </Link>{" "}
        <br />
        and{" "}
        <Link href={"/privacy"} className="text-brandDeep">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
};

export default Footer;
