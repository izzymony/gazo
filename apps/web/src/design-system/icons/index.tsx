/**
 * Central icon module (W3.8) — the single source of icons for the whole app.
 *
 * Every icon is backed by HugeIcons (@hugeicons/react + core-free-icons),
 * replacing the previous mix of react-icons (16 sets) + lucide-react. To keep
 * the migration low-risk we re-export under the *existing* call-site names, so
 * only import sources change and usages (`<CiSearch size={20} />`) are untouched.
 * Coloring still works via `className="text-*"` (HugeIcons stroke = currentColor).
 *
 * Follow-up: rename these to semantic names (Search, ChevronDown, …) and drop
 * the legacy aliases once call sites are swept.
 */
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  FavouriteIcon,
  Move01Icon,
  PlusSignIcon,
  MinusSignIcon,
  ShoppingBag02Icon,
  ShoppingCart02Icon,
  ShoppingCartAdd02Icon,
  Cancel01Icon,
  InformationCircleIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  SquareLock01Icon,
  Search01Icon,
  StarIcon,
  InstagramIcon,
  Location01Icon,
  TiktokIcon,
  NewTwitterIcon,
  UserMultipleIcon,
  CubeIcon,
  ViewIcon,
  ViewOffSlashIcon,
  Share01Icon,
  SmartPhone01Icon,
  CreditCardAddIcon,
  BellIcon,
  HelpSquareIcon,
  BubbleChatIcon,
  Book02Icon,
  GlobalIcon,
  DeliveryTruck01Icon,
  SquareArrowUpRightIcon,
  ArrowUpDownIcon,
  ArrowUpRight01Icon,
  ArrowDownRight01Icon,
  Store01Icon,
  StoreLocation01Icon,
  BankIcon,
  CheckmarkBadge01Icon,
  Shield01Icon,
  Invoice01Icon,
  SecurityLockIcon,
  LegalDocument01Icon,
  Logout01Icon,
  GiftIcon,
  Calendar01Icon,
  LockPasswordIcon,
  PencilEdit01Icon,
  Image01Icon,
  Tag01Icon,
  Settings01Icon,
  Clock01Icon,
  Wallet01Icon,
  PackageIcon,
  Home01Icon,
  Analytics01Icon,
  Menu01Icon,
  Camera01Icon,
  IdentityCardIcon,
  UserIcon,
  CreditCardIcon,
  Delete02Icon,
  Call02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";

export type IconProps = Omit<
  React.ComponentProps<typeof HugeiconsIcon>,
  "icon"
>;

const make = (icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]) => {
  const Icon = (props: IconProps) => <HugeiconsIcon icon={icon} {...props} />;
  Icon.displayName = "Icon";
  return Icon;
};

/* --- lucide-react replacements --- */
export const Check = make(Tick02Icon);
export const ChevronDown = make(ArrowDown01Icon);
export const ChevronRight = make(ArrowRight01Icon);
export const CircleCheck = make(CheckmarkCircle02Icon);
export const Copy = make(Copy01Icon);
export const Heart = make(FavouriteIcon);
/* Filled heart — the free HugeIcons set is outline-only (FavouriteIcon), so this
   solid glyph backs the "liked" state. Color via className (e.g. text-brand). */
export const HeartFilled = ({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
export const Move = make(Move01Icon);
export const Plus = make(PlusSignIcon);
export const Minus = make(MinusSignIcon);
export const Delete = make(Delete02Icon);
export const ShoppingBag = make(ShoppingBag02Icon);
/* Cart (view/nav) vs cart-add (the "add this item to cart" action) — distinct
   from ShoppingBag, which is for order/shop/purchase semantics, not the cart. */
export const ShoppingCart = make(ShoppingCart02Icon);
export const ShoppingCartAdd = make(ShoppingCartAdd02Icon);
export const X = make(Cancel01Icon);

/* --- react-icons replacements (name kept for zero-churn migration) --- */
export const AiOutlineInfoCircle = make(InformationCircleIcon);
export const BiArrowBack = make(ArrowLeft01Icon);
export const BiChevronDown = make(ArrowDown01Icon);
export const BiChevronUp = make(ArrowUp01Icon);
export const BsThreeDots = make(MoreHorizontalIcon);
export const BsThreeDotsVertical = make(MoreVerticalIcon);
export const CiLock = make(SquareLock01Icon);
export const CiSearch = make(Search01Icon);
export const FaHeart = make(FavouriteIcon);
export const FaPlus = make(PlusSignIcon);
export const FaStar = make(StarIcon);
export const FaInstagram = make(InstagramIcon);
export const FaLocationDot = make(Location01Icon);
export const FaTiktok = make(TiktokIcon);
export const FaXTwitter = make(NewTwitterIcon);
export const FiUsers = make(UserMultipleIcon);
export const GoChevronDown = make(ArrowDown01Icon);
export const IoIosArrowForward = make(ArrowRight01Icon);
export const IoIosCheckmark = make(Tick02Icon);
export const IoIosCheckmarkCircle = make(CheckmarkCircle02Icon);
export const IoIosCheckmarkCircleOutline = make(CheckmarkCircle01Icon);
export const IoCheckmark = make(Tick02Icon);
export const IoCubeOutline = make(CubeIcon);
export const MdFavoriteBorder = make(FavouriteIcon);
export const MdOutlineAddCard = make(CreditCardAddIcon);
export const MdVisibility = make(ViewIcon);
export const MdVisibilityOff = make(ViewOffSlashIcon);
export const PiCube = make(CubeIcon);
export const PiShareFatThin = make(Share01Icon);
export const RiAddLine = make(PlusSignIcon);
export const RiSubtractLine = make(MinusSignIcon);
export const TbDotsVertical = make(MoreVerticalIcon);
export const TbMobiledata = make(SmartPhone01Icon);

/* --- buyer settings/support rows (W3.8) --- */
export const Bell = make(BellIcon);
export const HelpSquare = make(HelpSquareIcon);
export const BubbleChat = make(BubbleChatIcon);
export const Book = make(Book02Icon);
export const Globe = make(GlobalIcon);

/* --- seller-dashboard list pages (B3.x) --- */
export const DeliveryTruck = make(DeliveryTruck01Icon);
export const SquareArrowUpRight = make(SquareArrowUpRightIcon);

/* --- catalog search/sort (systemisation) --- */
export const SortVertical = make(ArrowUpDownIcon);

/* --- analytics stat trend arrows (systemisation) --- */
export const ArrowUpRight = make(ArrowUpRight01Icon);
export const ArrowDownRight = make(ArrowDownRight01Icon);

/* --- seller settings menu (systemisation) --- */
export const Store = make(Store01Icon);
export const StoreLocation = make(StoreLocation01Icon);
export const Bank = make(BankIcon);
export const VerifiedBadge = make(CheckmarkBadge01Icon);
export const Shield = make(Shield01Icon);
export const Invoice = make(Invoice01Icon);
export const PrivacyLock = make(SecurityLockIcon);
export const LegalDoc = make(LegalDocument01Icon);
export const Logout = make(Logout01Icon);
export const Gift = make(GiftIcon);

/* --- order detail (systemisation) --- */
export const ChevronUp = make(ArrowUp01Icon);
export const Calendar = make(Calendar01Icon);

/* --- settings security (systemisation) --- */
export const LockPassword = make(LockPasswordIcon);

/* --- product options editor (systemisation) --- */
export const Edit = make(PencilEdit01Icon);
export const Photo = make(Image01Icon);
export const Tag = make(Tag01Icon);

/* --- wallet dashboard (systemisation) --- */
export const Settings = make(Settings01Icon);
export const Clock = make(Clock01Icon);
export const Wallet = make(Wallet01Icon);
export const Package = make(PackageIcon);

/* --- bottom nav / tab bar (systemisation) --- */
export const Home = make(Home01Icon);
export const Analytics = make(Analytics01Icon);

/* --- header / app chrome (systemisation) --- */
export const Menu = make(Menu01Icon);

/* --- inbox / messaging (systemisation) --- */
export const Search = make(Search01Icon);
export const Call = make(Call02Icon);
export const Send = make(SentIcon);
export const Add = make(PlusSignIcon);
export const ArrowLeft = make(ArrowLeft01Icon);
export const MoreVertical = make(MoreVerticalIcon);

/* --- KYC / verification (systemisation) --- */
export const Camera = make(Camera01Icon);
export const IdentityCard = make(IdentityCardIcon);

/* --- buyer floating nav (systemisation) --- */
export const User = make(UserIcon);

/* --- buyer profile menu (systemisation) --- */
export const CreditCard = make(CreditCardIcon);
