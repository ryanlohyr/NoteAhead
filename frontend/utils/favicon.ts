export const getFaviconPath = () => {
  const instance = process.env.NEXT_NOTEAHEAD_INSTANCE || "0";

  if (instance === "1") {
    return '/images/favicon-instance-1.png';
  }
  return '/images/favicon-instance-0.png';
};

export const getFaviconMetadata = () => {
  const faviconPath = getFaviconPath();
  
  return {
    icon: faviconPath,
    shortcut: faviconPath,
    apple: faviconPath,
  };
};

