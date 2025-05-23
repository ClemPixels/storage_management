import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { ID } from "node-appwrite";
import { getFileType, constructFileUrl } from "@/lib/utils";

// Optional: Replace with actual config constants
import { appwriteConfig } from "@/lib/appwrite/config";
import { InputFile } from "node-appwrite/file";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as Blob;
    const ownerId = formData.get("ownerId")?.toString();
    const accountId = formData.get("accountId")?.toString();

    if (!file || !ownerId || !accountId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Convert Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file as File).name || "upload";

    const inputFile = InputFile.fromBuffer(buffer, fileName);

    const { storage, databases } = await createAdminClient();

    const uploaded = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile
    );

    const fileMeta = {
      type: getFileType(uploaded.name).type,
      name: uploaded.name,
      url: constructFileUrl(uploaded.$id),
      extension: getFileType(uploaded.name).extension,
      size: uploaded.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [],
      bucketFileId: uploaded.$id,
    };

    const document = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      ID.unique(),
      fileMeta
    );

    return NextResponse.json(document, { status: 201 });
  } catch (err: unknown) {
    console.error("Upload failed:", err);
    const errorMessage =
      err && typeof err === "object" && "message" in err
        ? (err as { message?: string }).message
        : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
