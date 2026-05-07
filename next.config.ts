import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les Server Actions ont une limite de body de 1 Mo par défaut.
  // Plusieurs formulaires de l'app uploadent des justificatifs (jusqu'à
  // 5 Mo) ou des images de tickets : on relève la limite à 6 Mo pour
  // laisser une marge sur l'overhead du multipart FormData.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
