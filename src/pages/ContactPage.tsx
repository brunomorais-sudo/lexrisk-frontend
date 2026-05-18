import { useAuth } from '@/contexts/AuthContext';
import { clientCompanies, organizations, users, memberships } from '@/data/mock-data';
import { Mail, Phone, MapPin, Scale, Building2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Mock contact info por escritório (frontend-only)
const FIRM_CONTACT: Record<string, { phone: string; address: string; whatsapp: string }> = {
  'org-1': {
    phone: '+55 (11) 3456-7890',
    address: 'Av. Paulista, 1500 — 12º andar, Bela Vista, São Paulo/SP',
    whatsapp: '5511987654321',
  },
};

const LAWYER_PHONE: Record<string, string> = {
  'user-1': '+55 (11) 99876-1001',
  'user-2': '+55 (11) 99876-1002',
  'user-3': '+55 (11) 99876-1003',
};

export default function ContactPage() {
  const { organizationId } = useAuth();
  const company = clientCompanies.find(c => c.organization_id === organizationId);
  const lawFirmId = company?.responsible_law_firm_id || 'org-1';
  const firm = organizations.find(o => o.id === lawFirmId);
  const contact = FIRM_CONTACT[lawFirmId] || FIRM_CONTACT['org-1'];

  // Advogados do escritório responsável
  const firmLawyers = memberships
    .filter(m => m.organization_id === lawFirmId && (m.role === 'lawyer' || m.role === 'office_admin'))
    .map(m => {
      const u = users.find(u => u.id === m.user_id);
      return u ? { ...u, role: m.role, phone: LAWYER_PHONE[u.id] } : null;
    })
    .filter(Boolean) as Array<{ id: string; full_name: string; email: string; role: string; phone?: string }>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-header">Contato com o Escritório</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fale diretamente com o time jurídico responsável pelos seus processos
        </p>
      </div>

      {/* Card do escritório */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-6 mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{firm?.name}</h2>
            <p className="text-sm text-muted-foreground">CNPJ: {firm?.cnpj}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href={`tel:${contact.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {contact.phone}
              </a>
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                WhatsApp do escritório
              </a>
              <div className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                {contact.address}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lista de advogados */}
      <h2 className="section-title mb-4 flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Advogados Responsáveis
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {firmLawyers.map((lawyer, i) => (
          <motion.div
            key={lawyer.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-xl border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {lawyer.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {lawyer.full_name}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {lawyer.role === 'office_admin' ? 'Sócio responsável' : 'Advogado(a)'}
                </p>

                <div className="mt-3 space-y-1.5">
                  <a href={`mailto:${lawyer.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{lawyer.email}</span>
                  </a>
                  {lawyer.phone && (
                    <a href={`tel:${lawyer.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {lawyer.phone}
                    </a>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <a href={`mailto:${lawyer.email}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full gap-2">
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </Button>
                  </a>
                  {lawyer.phone && (
                    <a href={`tel:${lawyer.phone.replace(/\D/g, '')}`} className="flex-1">
                      <Button size="sm" className="w-full gap-2">
                        <Phone className="h-3.5 w-3.5" /> Ligar
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
