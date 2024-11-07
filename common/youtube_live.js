/*
 * Youtubeツール
 *
 * 設置例）
 * <script src="https://unpkg.com/microcms-js-sdk@3.1.2/dist/umd/microcms-js-sdk.js"></script>
 * <script src="./youtube_live.js"></script>
 * <script>
 * var setting = [];
 * setting['server_domain'] = '';
 * setting['api_key'] = '';
 * setting['end_point'] = '';
 * setting['archive_mode'] = '';
 * // 実行
 * new YoutubeTool(setting);
 * </script>
 */
class YoutubeLive {
	constructor(setting = []) {
		// 必須
		this.server_domain = setting.server_domain || null;
		this.api_key = setting.api_key || null;
		this.end_point = setting.end_point || null;
		this.archive_mode = setting.archive_mode || false;

		// オプション
		this.api_time = setting.api_time || 5000;
		this.youtube_width = setting.youtube_width || 1280;
		this.youtube_height = setting.youtube_height || 720;

		// 以下、定数
		const params = new URLSearchParams(window.location.search);
		this.content_id = params.get("cid") || null;
		this.draft_key = params.get("dkey") || null;
		this.loop_stop_flag = false;

		this.microcms = null;
		this.youtube = null;

		this.init();
	}

	init() {
		// バリデーション
		if (this.validate() == false) {
			return;
		} else {
			// メイン処理
			this.main();
		}
	}

	// バリデーション
	validate() {
		try {
			if (typeof this.server_domain == null) {
				throw new Error("server_domain is null");
			}
			if (typeof this.api_key == null) {
				throw new Error("api_key is null");
			}
			if (typeof this.end_point == null) {
				throw new Error("end_point is null");
			}
			if (typeof this.api_time == null) {
				throw new Error("api_time is null");
			}
			if (typeof this.content_id == null) {
				throw new Error("content_id is null");
			}

			return true;
		} catch (exception) {
			console.error("error:", exception.message);
			return false;
		}
	}

	// メイン処理
	main() {
		try {
			// インスタンスの生成
			const { createClient } = microcms;
			this.microcms = createClient({
				serviceDomain: this.server_domain,
				apiKey: this.api_key,
			});

			// Youtube
			var tag = document.createElement('script');
			tag.src = "https://www.youtube.com/iframe_api";
			var firstScriptTag = document.getElementsByTagName('script')[0];
			firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

			// API実行（初回アクセス時）
			this.execute();

			// ヘッダー固定するかどうか
			this.fixed_header();

			// サイズが変更したら
			window.addEventListener("resize", this.fixed_header.bind(this));

			// n秒おきにAPI実行
			setInterval(this.execute.bind(this), this.api_time);
		} catch (exception) {
			console.error("error:", exception.message);
			return false;
		}
	}

	// API成功時の関数
	api_success(response) {
		// 初回アクセス時
		if (this.youtube == null) {
			// youtube動画
			const youtube_parameter = {};
			youtube_parameter['videoId'] = response.youtube;
			youtube_parameter['width'] = this.youtube_width;
			youtube_parameter['height'] = this.youtube_height;

			// ライブの場合
			if (this.archive_mode == false) {
				youtube_parameter['playerVars'] = {};
				youtube_parameter['playerVars']['controls'] = 0;
				youtube_parameter['playerVars']['disablekb'] = 1;
				youtube_parameter['playerVars']['modestbranding'] = 1;
				youtube_parameter['playerVars']['rel'] = 0;
			}
			this.youtube = new YT.Player('youtube', youtube_parameter);

			// タイトル
			document.title = response.title;
			document.querySelector("#title").innerHTML = response.title;

			// 概要
			document.querySelector("#summary").innerHTML = response.summary;

			// コンテンツを表示
			document.querySelector("#loading").remove();
			document.querySelector("#main_content").classList.remove("hidden");
		}

		// タイトル
		document.title = response.title;
		document.querySelector("#title").innerHTML = response.title;

		// 概要
		document.querySelector("#summary").innerHTML = response.summary;

		// 追加コンテンツを表示
		if (response.content_view_flag == true && response.content) {
			document.querySelector("#content").innerHTML = response.content;
			document.querySelector("#content_wrapper").classList.remove("hidden");
		} else {
			document.querySelector("#content_wrapper").classList.add("hidden");
		}

		// 配信終了 + ループを止める
		if (response.streaming_end_flag == true) {
			document.querySelector("#youtube").remove();
			document.querySelector("#streaming_end").classList.add("text-white", "text-5xl", "py-40", "text-center", "leading-relaxed", "max-md:py-10");
			document.querySelector("#streaming_end").classList.remove("hidden");
			document.querySelector("#streaming_end").innerHTML = "配信は<br>終了しました";
			this.loop_stop_flag = true;
		}
	}

	// ヘッダー固定関数
	fixed_header() {
		var video_header = document.querySelector("#video_header");
		if (!video_header) {
			return;
		}
		video_header.style.height = null;

		// スマホの場合
		if (window.innerWidth < 640) {
			video_header.classList.add("sticky", "top-0", "w-full", "z-100");
		} else {
			video_header.classList.remove(
				"sticky",
				"top-0",
				"w-full",
				"z-40"
			);
		}
	}

	// API実行時の関数
	execute() {
		if (this.loop_stop_flag == true) {
			return;
		}
		this.microcms.get({
			endpoint: this.end_point,
			contentId: this.content_id,
			queries: {
				draftKey: this.draft_key,
			}
			// API成功
		}).then((response) => {
			this.api_success(response);
			// APIエラー
		}).catch((error) => {
			this.api_error(error);
		});
	}

	// APIエラー時の関数
	api_error(error) {
		this.loop_stop_flag = true;
	}
}