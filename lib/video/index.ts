import { isPostgresEnabled } from "@/lib/db/config";
import { postgresVideoRepository } from "@/lib/video/postgres-repository";
import type { VideoRepository } from "./repository";

class UnsupportedVideoRepository implements VideoRepository {
  private fail(): never {
    throw new Error("Video generation requires DATABASE_PROVIDER=postgres.");
  }

  createVideo = async () => this.fail();
  updateVideo = async () => this.fail();
  findVideoById = async () => this.fail();
  findVideoByIdForUser = async () => this.fail();
  listVideosForUser = async () => this.fail();
  deleteVideo = async () => this.fail();
  findVideoByStorageKey = async () => this.fail();
  createJob = async () => this.fail();
  updateJob = async () => this.fail();
  findJobById = async () => this.fail();
  findJobByIdForUser = async () => this.fail();
  findActiveJobByRequestId = async () => this.fail();
  claimNextJob = async () => this.fail();
  countVideosForUser = async () => this.fail();
}

export const videoRepository: VideoRepository = isPostgresEnabled()
  ? postgresVideoRepository
  : new UnsupportedVideoRepository();
