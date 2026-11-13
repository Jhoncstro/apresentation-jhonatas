CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organizations, public.organization_members TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.add_creator_as_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner');
  INSERT INTO public.rules (organization_id, code, name) VALUES
    (NEW.id, 'r1', 'Alertar quando o prazo for menor que 24h'),
    (NEW.id, 'r2', 'Alertar operação crítica sem responsável'),
    (NEW.id, 'r3', 'Sinalizar operações atrasadas');
  RETURN NEW;
END $$;

CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_member(id) OR created_by = auth.uid());
CREATE POLICY "create org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "members update org" ON public.organizations FOR UPDATE TO authenticated USING (public.is_member(id));
CREATE POLICY "read own memberships" ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_member(organization_id));

CREATE TABLE public.operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  owner text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'Média',
  due date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'A fazer',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE public.reviews (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_key text NOT NULL,
  reviewed_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, insight_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations, public.rules, public.reviews TO authenticated;
GRANT ALL ON public.operations, public.rules, public.reviews TO service_role;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members ops" ON public.operations FOR ALL TO authenticated USING (public.is_member(organization_id)) WITH CHECK (public.is_member(organization_id));
CREATE POLICY "members rules" ON public.rules FOR ALL TO authenticated USING (public.is_member(organization_id)) WITH CHECK (public.is_member(organization_id));
CREATE POLICY "members reviews" ON public.reviews FOR ALL TO authenticated USING (public.is_member(organization_id)) WITH CHECK (public.is_member(organization_id));

CREATE TRIGGER on_org_created AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_owner();