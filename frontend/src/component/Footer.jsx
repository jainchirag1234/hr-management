function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 py-4 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
        <span>
          &copy; {year}{" "}
          <span className="font-semibold bg-blue-700 bg-clip-text text-transparent">
            HR Portal
          </span>
          . All rights reserved.
        </span>
        <span>Built with ❤️ for your team</span>
      </div>
    </footer>
  );
}

export default Footer;
