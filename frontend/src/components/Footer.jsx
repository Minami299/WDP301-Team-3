import { IconMapPin } from "./Icons";

export default function Footer() {
  return (
    <footer className="bg-bg-default border-t border-border pt-16 pb-8">
      <div className="max-w-[1440px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <IconMapPin size={16} className="text-white" />
              </div>
              <span className="font-heading font-800 text-text-primary text-lg tracking-tight">travelio</span>
            </div>
            <p className="text-sm text-text-primary-600 mb-6">
              Your Journey, Seamlessly Booked. Discover and book hotels, attractions, and experiences worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-700 text-text-primary mb-4">About</h4>
            <ul className="space-y-2 text-sm text-text-primary-600">
              <li><a href="#" className="hover:text-primary-500">About Us</a></li>
              <li><a href="#" className="hover:text-primary-500">Careers</a></li>
              <li><a href="#" className="hover:text-primary-500">Press</a></li>
              <li><a href="#" className="hover:text-primary-500">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-700 text-text-primary mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-text-primary-600">
              <li><a href="#" className="hover:text-primary-500">Help Center</a></li>
              <li><a href="#" className="hover:text-primary-500">Safety Information</a></li>
              <li><a href="#" className="hover:text-primary-500">Cancellation Options</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-700 text-text-primary mb-4">Partner with us</h4>
            <ul className="space-y-2 text-sm text-text-primary-600">
              <li><a href="#" className="hover:text-primary-500">Partner Portal</a></li>
              <li><a href="#" className="hover:text-primary-500">Affiliate Program</a></li>
              <li><a href="#" className="hover:text-primary-500">Connectivity Partners</a></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border text-sm text-text-primary-600">
          <div>&copy; 2026 Travelio. All rights reserved.</div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-primary-500">Privacy Policy</a>
            <a href="#" className="hover:text-primary-500">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
