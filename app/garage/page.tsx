import type { Metadata } from "next";
import GarageView from "../_components/GarageView";

export const metadata: Metadata = {
  title: "Garage — Motormind",
  description: "Your saved Motormind checks — stored on this device only.",
};

export default function GaragePage() {
  return <GarageView />;
}
