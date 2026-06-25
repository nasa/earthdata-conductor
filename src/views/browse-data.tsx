import TerraDataAccess from "@nasa-terra/components/dist/react/data-access/index.js";
import { useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";
import { useViewState } from "skybridge/web";
import { useEffect } from "react";

export default function BrowseData() {
  const toolInfo = useToolInfo();
  const [state, setState] = useViewState()

  console.log(state, setState)

  useEffect(() => {
    setState({
      foo: 'bar'
    })
  }, [])

  return (
    <TerraProvider>
      <TerraDataAccess
        shortName={toolInfo.input?.shortName}
        version={toolInfo.input?.version}
      ></TerraDataAccess>
    </TerraProvider>
  );
}
