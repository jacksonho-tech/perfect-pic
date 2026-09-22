import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useSettings } from "@/lib/auth";
import { hkd, endTime } from "@/lib/money";
import { depositFor, endsTooLate, priceFor } from "@/lib/pricing";
import { SERVICE_LABELS, type Companion, type ServiceType } from "@/lib/types";

export function BookingPanel({ companion }: { companion: Companion }) {
  const services = (companion.companion_services ?? []).filter((s) => s.is_active);
  const [serviceType, setServiceType] = useState<ServiceType>(
    services[0]?.service_type ?? "drinking",
  );
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("22:00");
  const [extraHours, setExtraHours] = useState(0);
  const [hours, setHours] = useState(3);
  const [partyMode, setPartyMode] = useState("none");
  const { user } = useSession();
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const service = services.find((s) => s.service_type === serviceType);
  if (!service) {
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        No services published yet.
      </div>
    );
  }

  const isHourly = service.billing_type === "hourly";
  const price = priceFor(service, {
    extraHours,
    hours,
    travelFee: isHourly ? Number(companion.travel_fee) : 0,
  });
  const depositPercent = Number(settings?.deposit_percent ?? 30);
  const deposit = depositFor(price.total, depositPercent);
  const tooLate = endsTooLate(startTime, price.hours);

  const addToCart = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("sign-in");
      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        companion_id: companion.id,
        service_type: serviceType,
        event_date: date,
        start_time: startTime,
        hours: isHourly ? hours : service.base_hours,
        extra_hours: isHourly ? 0 : extraHours,
        party_mode: partyMode === "none" ? null : partyMode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Session added to your cart");
      navigate({ to: "/cart" });
    },
    onError: (e: Error) => {
      if (e.message === "sign-in") {
        toast.error("Please sign in to book time");
        navigate({ to: "/auth" });
        return;
      }
      toast.error(e.message);
    },
  });

  const dateInPast = date !== "" && new Date(date) < new Date(new Date().toDateString());
  const canBook = date !== "" && !dateInPast && !tooLate;

  return (
    <div className="surface-panel glow-shadow space-y-5 p-6">
      <div>
        <h3 className="font-display text-lg font-semibold">Book time</h3>
        <p className="text-xs text-muted-foreground">
          {isHourly
            ? `Hourly, minimum ${service.min_hours} hours, finishing by 5 AM.`
            : `Night session: ${service.base_hours} hours from 10 PM, finishing by 5 AM at the latest.`}
        </p>
      </div>

      <div>
        <Label className="text-xs">Service</Label>
        <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.service_type}>
                {SERVICE_LABELS[s.service_type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Date</Label>
          <Input
            className="mt-1.5"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Start</Label>
          <Input
            className="mt-1.5"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
      </div>

      {isHourly ? (
        <div>
          <Label className="text-xs">Hours</Label>
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 4, 5, 6, 7].map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {h} hours
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div>
            <Label className="text-xs">Overtime</Label>
            <Select value={String(extraHours)} onValueChange={(v) => setExtraHours(Number(v))}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No extra hours</SelectItem>
                {[1, 2, 3].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    +{h} hour{h > 1 ? "s" : ""} ({hkd(h * Number(service.extra_hour_price))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Party Mode (optional)</Label>
            <Select value={partyMode} onValueChange={setPartyMode}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No package</SelectItem>
                <SelectItem value="Drink budget HKD 800 + party games">
                  Drink budget HKD 800 + party games
                </SelectItem>
                <SelectItem value="Drink budget HKD 1,500 + party games">
                  Drink budget HKD 1,500 + party games
                </SelectItem>
                <SelectItem value="Party games only">Party games only</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Each companion decides her own alcohol intake. Nothing here rewards drinking to
              excess.
            </p>
          </div>
        </>
      )}

      <div className="space-y-1.5 border-t border-border pt-4 text-sm">
        <Row label={isHourly ? `${price.hours} hours` : "Night session"} value={hkd(price.base)} />
        {price.extras > 0 && <Row label="Extra hours" value={hkd(price.extras)} />}
        {price.travel > 0 && <Row label="Travel / setup" value={hkd(price.travel)} />}
        <Row label="Total" value={hkd(price.total)} bold />
        <Row label={`Deposit (${depositPercent}%)`} value={hkd(deposit)} />
        <p className="pt-1 text-[11px] text-muted-foreground">
          Ends around {endTime(startTime, price.hours)}. The balance is settled at the event.
        </p>
      </div>

      {tooLate && (
        <p className="text-xs text-destructive">This session would finish after 5 AM.</p>
      )}
      {dateInPast && <p className="text-xs text-destructive">Choose a future date.</p>}

      <Button
        className="w-full"
        disabled={!canBook || addToCart.isPending}
        onClick={() => addToCart.mutate()}
      >
        {addToCart.isPending ? "Adding..." : "Book this session"}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Bookings take place at public venues only.
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-primary" : ""}>{value}</span>
    </div>
  );
}
