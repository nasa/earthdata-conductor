import TerraDataAccess from "@nasa-terra/components/dist/react/data-access/index.js";
import { useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";
import { useEffect } from "react";
import { useViewState } from "skybridge/web";

export default function BrowseData() {
  const toolInfo = useToolInfo<"browse-data">();
  const [state, setState] = useViewState();

  console.log(state, setState);

  useEffect(() => {
    setState({
      foo: "bar",
    });
  }, []);

  return (
    <TerraProvider>
      <TerraDataAccess
        shortName={toolInfo.input?.shortName}
        version={toolInfo.input?.version}
      ></TerraDataAccess>
    </TerraProvider>
  );
}
