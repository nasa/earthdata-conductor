- tool to create a job on behalf of the user and get a job id
- loads the harmony subsetter UI with that job id


query turned into dataset, spatial, and temporal
dataset chooser component
output format component
    nicer way of presenting it
    browse original data (X granules, estimated size XGB)
    transform data to NetCDF
    plot area-averaged time series
    plot area-averaged map
data access component
subsetter component
giovanni time series
giovanni map


== COMPONENT Changes
    Data Access
        Needs to accept spatial, temporal, etc. parameters
    Subsetter
        Needs to be able to take in output format, spatial, etc. props
        fire event when done
        Ideally we would just load the compnent immediately and let the component do the Harmony wrangling in the user's browser