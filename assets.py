import os
import hashlib
import requests
from webflow.client import Webflow
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Webflow client
webflow = Webflow(access_token=os.getenv("WEBFLOW_API_TOKEN"))

# Asset details
asset_details = [
    {
        "folderName": "Universal Assets",
        "assets": ["https://images.unsplash.com/photo-1451187580459-43490279c0fa"],
    },
    {
        "folderName": "English Assets",
        "assets": [
            "https://images.unsplash.com/photo-1543109740-4bdb38fda756",
            "https://images.unsplash.com/photo-1665410620550-c54105af7d0c",
            "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9",
        ],
    },
    {
        "folderName": "French Assets",
        "assets": [
            "https://images.unsplash.com/photo-1454386608169-1c3b4edc1df8",
            "https://images.unsplash.com/photo-1500039436846-25ae2f11882e",
            "https://images.unsplash.com/photo-1528717663417-3742fee05a29",
        ],
    },
]

# Function to create an asset folder
def create_asset_folder(site_id, folder_name):
    existing_folders = webflow.assets.list_folders(site_id)
    # Use attribute-based access for 'display_name'
    existing_folder = next((folder for folder in existing_folders.asset_folders if folder.display_name == folder_name), None)
    if existing_folder:
        print(f"Folder '{folder_name}' already exists with ID: {existing_folder.id}")
        return existing_folder.id

    # Creating folder if not exists
    print(f"Creating folder: {folder_name}")
    response = webflow.assets.create_folder(site_id=site_id, displayName=folder_name)
    print(f"Folder '{folder_name}' created with ID: {response.id}")
    return response.id

# Function to hash file data from URL
def get_file_hash_from_url(asset_url):
    response = requests.get(asset_url, stream=True)
    hash_sha256 = hashlib.sha256()
    for chunk in response.iter_content(8192):
        hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

# Function to upload an asset to Webflow via S3
def upload_asset(site_id, folder_id, asset_url):
    try:
        file_hash = get_file_hash_from_url(asset_url)
        file_name = asset_url.split("/")[-1]

        # Initiating the upload
        upload_init = webflow.assets.create(
            site_id=site_id, 
            parent_folder=folder_id,
            file_name=file_name + ".jpeg",
            file_hash=file_hash,
        )

        # Access upload details via attributes
        upload_url = upload_init.upload_url
        upload_details = upload_init.upload_details

        # Prepare the form data
        form_data = {
            "acl": upload_details.acl,
            "bucket": upload_details.bucket,
            "X-Amz-Algorithm": upload_details.x_amz_algorithm,
            "X-Amz-Credential": upload_details.x_amz_credential,
            "X-Amz-Date": upload_details.x_amz_date,
            "key": upload_details.key,
            "Policy": upload_details.policy,
            "X-Amz-Signature": upload_details.x_amz_signature,
            "success_action_status": upload_details.success_action_status,
            "Content-Type": upload_details.content_type,
            "Cache-Control": upload_details.cache_control,
        }

        # File to upload
        response = requests.get(asset_url, stream=True)
        files = {"file": (file_name, response.raw, upload_details.content_type)}

        # Upload to S3
        upload_response = requests.post(upload_url, data=form_data, files=files)
        if upload_response.status_code == 201:
            print(f"Successfully uploaded {file_name} to Webflow.")
        else:
            print(f"Failed to upload {file_name}. Status: {upload_response.status_code}")
    except Exception as e:
        print(f"Error uploading asset from {asset_url}: {e}")

# Main function to execute folder creation and asset upload
def main():
    site_id = os.getenv("SITE_ID")
    for folder in asset_details:
        folder_id = create_asset_folder(site_id, folder["folderName"])
        if folder_id:
            for asset_url in folder["assets"]:
                upload_asset(site_id, folder_id, asset_url)

if __name__ == "__main__":
    main()
