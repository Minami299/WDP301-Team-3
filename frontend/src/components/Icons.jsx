import {
  AlertTriangle, ArrowRight, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Coffee, DollarSign,
  Download, Eye, EyeOff, Filter, Home, Hotel, LogOut, Lock, Mail, Map, MapPin, Minus, Package, Percent, Plus,
  QrCode, RefreshCw, Search, Shield, SquarePen, Star, Ticket, Trash2, TrendingUp, User, Users, Wifi, X, Zap, Bell,
  Calendar, ChartColumn, Gift,
} from "lucide-react";

// Every icon in the app comes from lucide-react. These wrappers keep the original
// names and props (size, className, filled) so existing screens need no changes.
const wrap = (Icon, displayName) => {
  const Wrapped = ({ size = 16, className = "", strokeWidth = 2, ...rest }) => (
    <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest} />
  );
  Wrapped.displayName = displayName;
  return Wrapped;
};

export const IconSearch = wrap(Search, "IconSearch");
export const IconMapPin = wrap(MapPin, "IconMapPin");
export const IconCalendar = wrap(Calendar, "IconCalendar");
export const IconUsers = wrap(Users, "IconUsers");
export const IconStar = ({ size = 16, className = "", filled = false, ...rest }) => (
  <Star size={size} className={className} aria-hidden="true" fill={filled ? "currentColor" : "none"} {...rest} />
);
export const IconChevronDown = wrap(ChevronDown, "IconChevronDown");
export const IconChevronRight = wrap(ChevronRight, "IconChevronRight");
export const IconChevronLeft = wrap(ChevronLeft, "IconChevronLeft");
export const IconHotel = wrap(Hotel, "IconHotel");
export const IconTicket = wrap(Ticket, "IconTicket");
export const IconPackage = wrap(Package, "IconPackage");
export const IconQR = wrap(QrCode, "IconQR");
export const IconDownload = wrap(Download, "IconDownload");
export const IconBell = wrap(Bell, "IconBell");
export const IconX = wrap(X, "IconX");
export const IconCheck = wrap(Check, "IconCheck");
export const IconTrendingUp = wrap(TrendingUp, "IconTrendingUp");
export const IconDollar = wrap(DollarSign, "IconDollar");
export const IconPercent = wrap(Percent, "IconPercent");
export const IconAlertTriangle = wrap(AlertTriangle, "IconAlertTriangle");
export const IconClock = wrap(Clock, "IconClock");
export const IconMap = wrap(Map, "IconMap");
export const IconFilter = wrap(Filter, "IconFilter");
export const IconArrowRight = wrap(ArrowRight, "IconArrowRight");
export const IconCamera = wrap(Camera, "IconCamera");
export const IconWifi = wrap(Wifi, "IconWifi");
export const IconCoffee = wrap(Coffee, "IconCoffee");
export const IconPlus = wrap(Plus, "IconPlus");
export const IconMinus = wrap(Minus, "IconMinus");
export const IconHome = wrap(Home, "IconHome");
export const IconBarChart = wrap(ChartColumn, "IconBarChart");
export const IconUser = wrap(User, "IconUser");
export const IconLogOut = wrap(LogOut, "IconLogOut");
export const IconZap = wrap(Zap, "IconZap");
export const IconShield = wrap(Shield, "IconShield");
export const IconEye = wrap(Eye, "IconEye");
export const IconEyeOff = wrap(EyeOff, "IconEyeOff");
export const IconMail = wrap(Mail, "IconMail");
export const IconLock = wrap(Lock, "IconLock");
export const IconRefreshCw = wrap(RefreshCw, "IconRefreshCw");
export const IconEdit = wrap(SquarePen, "IconEdit");
export const IconTrash = wrap(Trash2, "IconTrash");
export const IconGift = wrap(Gift, "IconGift");
