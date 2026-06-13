# Infrastructure

Ce dossier est réservé aux fichiers de configuration d'infrastructure (Terraform, Kubernetes, Ansible).

L'infrastructure de production Primeo est actuellement gérée manuellement via le dashboard Supabase et le panneau de déploiement Render/Railway. Les fichiers de configuration IaC seront ajoutés ici lors de la migration vers une infrastructure déclarative.

Sous-dossiers prévus :
- `terraform/` — provisioning cloud (VPS, base de données, CDN)
- `kubernetes/` — déploiement containerisé (si applicable)
- `ansible/` — configuration des serveurs
