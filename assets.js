require("dotenv").config();
const { WebflowClient } = require("webflow-api");
const crypto = require("crypto");
const axios = require("axios");
const FormData = require("form-data");

const webflow = new WebflowClient({
  accessToken: process.env.WEBFLOW_API_TOKEN,
});

// Organize folders and assets
const assetDetails = [
  {
    folderName: "Universal Assets",
    assets: ["https://images.unsplash.com/photo-1451187580459-43490279c0fa"],
  },
  {
    folderName: "English Assets",
    assets: [
      "https://images.unsplash.com/photo-1543109740-4bdb38fda756",
      "https://images.unsplash.com/photo-1665410620550-c54105af7d0c",
      "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9",
    ],
  },
  {
    folderName: "French Assets",
    assets: [
      "https://images.unsplash.com/photo-1454386608169-1c3b4edc1df8",
      "https://images.unsplash.com/photo-1500039436846-25ae2f11882e",
      "https://images.unsplash.com/photo-1528717663417-3742fee05a29",
    ],
  },
];

// Function to create an asset folder
async function createAssetFolder(siteId, folderName) {
  try {
    // Check if the folder already exists
    const existingFolders = await webflow.assets.listFolders(siteId);
    const existingFolder = existingFolders.assetFolders.find(
      (folder) => folder.displayName === folderName
    );
    if (existingFolder) {
      console.log(
        `Folder '${folderName}' already exists with ID: ${existingFolder.id}`
      );
      return existingFolder.id;
    }

    // Create the folder if it does not exist
    console.log(`Creating folder: ${folderName}`);
    const response = await webflow.assets.createFolder(siteId, {
      displayName: folderName,
    });
    console.log(`Folder '${folderName}' created with ID: ${response.id}`);
    return response.id; // Return folder ID for further use
  } catch (error) {
    console.error(
      `Error creating or retrieving asset folder '${folderName}':`,
      error
    );
  }
}

// Function to hash file data from URL
async function getFileHashFromUrl(assetUrl) {
  // Create a promise to handle asynchronous hashing of the file data
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch the file as a stream
      const response = await axios.get(assetUrl, { responseType: "stream" });

      // Initialize SHA-256 hash
      const hash = crypto.createHash("sha256");

      // Update the hash with each chunk of data received from the stream
      response.data.on("data", (data) => hash.update(data));

      // Finalize the hash calculation and resolve the promise with the hash value
      response.data.on("end", () => resolve(hash.digest("hex")));
      response.data.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Function to upload an asset to Webflow via S3
async function uploadAsset(siteId, folderId, assetUrl) {
  try {
    // Generate the file hash for validation
    const fileHash = await getFileHashFromUrl(assetUrl);
    const fileName = assetUrl.split("/").pop();

    // Step 1: Initialize the upload
    const uploadInit = await webflow.assets.create(siteId, {
      parentFolder: folderId,
      fileName: fileName + `.jpeg`,
      fileHash: fileHash,
    });
    const { uploadUrl, uploadDetails } = uploadInit;

    // Create form data for S3 upload
    const form = new FormData();

    // Append all required fields to the form
    form.append("acl", uploadDetails.acl);
    form.append("bucket", uploadDetails.bucket);
    form.append("X-Amz-Algorithm", uploadDetails.xAmzAlgorithm);
    form.append("X-Amz-Credential", uploadDetails.xAmzCredential);
    form.append("X-Amz-Date", uploadDetails.xAmzDate);
    form.append("key", uploadDetails.key);
    form.append("Policy", uploadDetails.policy);
    form.append("X-Amz-Signature", uploadDetails.xAmzSignature);
    form.append("success_action_status", uploadDetails.successActionStatus);
    form.append("Content-Type", uploadDetails.contentType);
    form.append("Cache-Control", uploadDetails.cacheControl);

    // Append the file to be uploaded
    const response = await axios.get(assetUrl, { responseType: "stream" });
    form.append("file", response.data, {
      filename: fileName,
      contentType: uploadDetails.contentType,
    });
    console.log(response);

    // Step 2: Upload to the provided S3 URL
    const uploadResponse = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    if (uploadResponse.status === 201) {
      console.log(`Successfully uploaded ${fileName} to Webflow.`);
    } else {
      console.error(
        `Failed to upload ${fileName}. Response status: ${uploadResponse.status}`
      );
    }
  } catch (error) {
    console.error(`Error uploading asset from ${assetUrl}:`, error);
  }
}

// Main function to execute the upload
(async () => {
  const siteId = process.env.SITE_ID; // Replace with your actual site ID

  for (const { folderName, assets } of assetDetails) {
    const folderId = await createAssetFolder(siteId, folderName);
    if (folderId) {
      for (const assetUrl of assets) {
        await uploadAsset(siteId, folderId, assetUrl);
      }
    }
  }
})();
