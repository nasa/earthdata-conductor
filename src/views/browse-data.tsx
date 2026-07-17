import { LatLngBounds } from "@nasa-terra/components/dist/components/map/models/LatLngBounds.js";
import {
  type MapEventDetail,
  MapEventType,
} from "@nasa-terra/components/dist/components/map/type.js";
import TerraDataAccess from "@nasa-terra/components/dist/react/data-access/index.js";
import { useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";
import { useEffect } from "react";
import { useViewState } from "skybridge/web";

const parseBboxFromWkt = (wkt?: string): number[] | undefined => {
  if (!wkt) return undefined;
  const matches = [...wkt.matchAll(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g)];
  if (matches.length >= 4) {
    const lons = matches.map((m) => Number(m[1]));
    const lats = matches.map((m) => Number(m[2]));
    return [
      Math.min(...lons),
      Math.min(...lats),
      Math.max(...lons),
      Math.max(...lats),
    ];
  }
  return undefined;
};

export default function BrowseData() {
  const toolInfo = useToolInfo<"browse-data">();
  const [state, setState] = useViewState();

  console.log(state, setState);

  useEffect(() => {
    setState({
      foo: "bar",
    });
  }, [setState]);

  const bbox = parseBboxFromWkt(toolInfo.input?.spatialWkt);
  const searchParams = {
    startDate: toolInfo.input?.startDate || undefined,
    endDate: toolInfo.input?.endDate || undefined,
    location: bbox
      ? ({
          type: MapEventType.BBOX,
          bounds: new LatLngBounds(bbox),
          cause: "search",
        } as MapEventDetail)
      : null,
  };

  return (
    <TerraProvider>
      <TerraDataAccess
        shortName={toolInfo.input?.shortName}
        version={toolInfo.input?.version}
        searchParams={searchParams}
      ></TerraDataAccess>
    </TerraProvider>
  );
}
