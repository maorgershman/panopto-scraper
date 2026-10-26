const csrf = (await cookieStore.get("csrfToken")).value;

const results = [...document.querySelectorAll("tr.list-view-row.draggable")]
  .map(element => [element.ariaLabel, element.id]);

const output = await Promise.all(
  results.map(async ([name, id]) => {
    const response = await fetch(
      "https://panoptotech.cloud.panopto.eu/Panopto/Pages/Viewer/DeliveryInfo.aspx",
      {
        headers: {
          "accept": "*/*",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "x-csrf-token": csrf,
        },
        referrer: `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Viewer.aspx?id=${id}`,
        body: new URLSearchParams({
          deliveryId: id,
          isLiveNotes: "false",
          refreshAuthCookie: "true",
          isActiveBroadcast: "false",
          isEditing: "false",
          isKollectiveAgentInstalled: "false",
          isEmbed: "false",
          responseType: "json",
        }),
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch "${name}" (${id}): HTTP ${response.status}`);
    }

    const result = await response.json();
    const streamUrl = new URL(result.Delivery.PodcastStreams[0].StreamUrl);
    const cleanUrl = streamUrl.origin + streamUrl.pathname;

    return [name, id, cleanUrl];
  })
);

console.log(output);

const dir = await window.showDirectoryPicker({ mode: "readwrite" });

for (let i = 0; i < output.length; i++) {
  const [name, , url] = output[i];
  const filename = `${name}.mp4`;

  console.log(`Downloading ${filename}...`);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed: ${filename} (${response.status})`);
    continue;
  }

  const file = await dir.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();

  await writable.write(await response.blob());
  await writable.close();

  console.log(`Saved: ${filename}`);
}

console.log("All downloads completed.");