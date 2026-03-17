# nodejs-argo

A collection of scripts to deploy high-performance proxy services on various container platforms including Node.js and Docker.

## 🚀 Features

- **Multi-Protocol Support**: VLESS, VMESS, and TROJAN protocols are supported.
- **Argo Tunnel Integration**: Seamlessly connect via Cloudflare Argo Tunnel (Fixed or Temporary).
- **Lightweight**: Optimized for platforms like Koyeb, Railway, and Render using Alpine Linux.
- **Automatic Deployment**: GitHub Actions workflow included for easy Docker Image building.

## 🛠️ Configuration

You can configure the following Environment Variables:

| Variable | Description |
| :--- | :--- |
| `UUID` | Your proxy ID (VLESS/VMess) |
| `ARGO_DOMAIN` | Your fixed Cloudflare tunnel domain |
| `ARGO_AUTH` | Cloudflare Tunnel Token or JSON |
| `CFIP` | Cloudflare Clean IP/Domain (e.g., 172.67.73.4) |

## ⚠️ Notes

- This project is for educational purposes only.
- Ensure you comply with your cloud provider's terms of service.

## ❤️ Credits

Special thanks to [eooce](https://github.com/eooce) for the original script inspiration.