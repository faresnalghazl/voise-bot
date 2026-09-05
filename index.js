const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { 
    joinVoiceChannel, 
    getVoiceConnection,
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus, 
    entersState,
    StreamType
} = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const TOKEN = 'MTU0MDQ4NjQyNDc3OTAzMDY1OQ.GM-L7n.Vjz11jgSy4wajzNsn55q0loQalzCSPmxuxmpd8';
const PREFIX = '!';

const serverData = new Map();

client.once('ready', () => {
    console.log(`✅ البوت جاهز ومتصل بنجاح: ${client.user.tag}`);
});

function getActionButtons(isPaused = false, videoUrl = '') {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_pause_resume')
            .setLabel(isPaused ? 'استئناف' : 'إيقاف مؤقت')
            .setEmoji(isPaused ? '▶️' : '⏸️')
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('btn_replay')
            .setLabel('إعادة')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('btn_stop')
            .setLabel('إيقاف')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger)
    );

    if (videoUrl && videoUrl.startsWith('http')) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('اليوتيوب')
                .setEmoji('🔗')
                .setURL(videoUrl)
                .setStyle(ButtonStyle.Link)
        );
    }

    return row;
}

async function playAudio(guildId, voiceChannel, query, messageChannel, requestedUser) {
    let cleanQuery = query;
    if (cleanQuery.includes('youtube.com/watch?v=') && cleanQuery.includes('&list=')) {
        cleanQuery = cleanQuery.split('&list=')[0];
    }

    const oldData = serverData.get(guildId);
    if (oldData) {
        if (oldData.ffmpegProcess) oldData.ffmpegProcess.kill();
        if (oldData.player) oldData.player.stop();
    }

    const rawData = await youtubedl(cleanQuery, {
        dumpSingleJson: true,
        format: 'bestaudio',
        noWarnings: true,
        noPlaylist: true,
        defaultSearch: 'ytsearch'
    });

    const video = rawData.entries ? rawData.entries[0] : rawData;
    const title = video.title || 'مقطع غير معروف';
    const videoUrl = video.webpage_url || cleanQuery;
    const thumbnail = video.thumbnail || '';
    const uploader = video.uploader || 'YouTube';
    const duration = video.duration_string || `${video.duration || 0} ثانية`;
    const audioUrl = video.url;

    const ffmpegProcess = spawn(ffmpeg, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', audioUrl,
        '-f', 'opus',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    let connection = getVoiceConnection(guildId);
    if (!connection) {
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            connection.destroy();
            serverData.delete(guildId);
        }
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    const resource = createAudioResource(ffmpegProcess.stdout, {
        inputType: StreamType.OggOpus
    });

    const player = createAudioPlayer();
    player.play(resource);
    connection.subscribe(player);

    // ================= التصميم الجمالي المطور =================
    const musicEmbed = new EmbedBuilder()
        .setColor(0x2B2D31) // لون داكن فخم يتماشى مع واجهة ديسكورد
        .setAuthor({ 
            name: '🎵 مشغل الموسيقى | جاري البث الآن', 
            iconURL: client.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle(title)
        .setURL(videoUrl)
        .setDescription(
            `> 📻 **القناة:** \`${uploader}\`\n` +
            `> ⏱️ **المدة:** \`${duration}\`\n` +
            `> 🎧 **طُلب بواسطة:** <@${requestedUser.id}>\n\n` +
            `\`0:00\` 🔘▬▬▬▬▬▬▬▬▬▬▬ \`${duration}\``
        )
        .setImage(thumbnail)
        .setFooter({ 
            text: `Dev xFazq`, 
            iconURL: requestedUser.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

    const buttons = getActionButtons(false, videoUrl);
    const msg = await messageChannel.send({ embeds: [musicEmbed], components: [buttons] });

    serverData.set(guildId, {
        player,
        ffmpegProcess,
        connection,
        voiceChannel,
        query: cleanQuery,
        videoUrl,
        messageChannel,
        msg,
        isPaused: false,
        requestedUser
    });

    player.on(AudioPlayerStatus.Idle, () => {
        ffmpegProcess.kill();
        msg.edit({ components: [] }).catch(() => {});
    });

    player.on('error', error => {
        console.error('Player Error:', error);
        ffmpegProcess.kill();
        messageChannel.send('⚠️ حدث خطأ أثناء تشغيل الصوت.');
    });
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ').trim();
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply('⚠️ يجب أن تكون داخل روم صوتي أولاً!');
        }

        if (!query) {
            return message.reply('⚠️ يرجى إدخال اسم المقطع أو الرابط!');
        }

        const loadingMsg = await message.reply('⚡ **جاري المعالجة والتحضير...**');

        try {
            await playAudio(message.guild.id, voiceChannel, query, message.channel, message.author);
            await loadingMsg.delete().catch(() => {});
        } catch (error) {
            console.error('--- تفاصيل الخطأ ---', error);
            loadingMsg.edit(`⚠️ خطأ: \`${error.message || error}\``);
        }
    }

    if (command === 'stop') {
        const data = serverData.get(message.guild.id);
        const connection = getVoiceConnection(message.guild.id);

        if (!connection && !data) {
            return message.reply('⚠️ البوت ليس متصلاً بأي روم صوتي.');
        }

        if (data) {
            if (data.ffmpegProcess) data.ffmpegProcess.kill();
            if (data.player) data.player.stop();
            if (data.msg) data.msg.edit({ components: [] }).catch(() => {});
        }
        if (connection) connection.destroy();
        serverData.delete(message.guild.id);

        message.reply('⏹️ تم إيقاف التشغيل ومغادرة الروم.');
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const guildId = interaction.guildId || interaction.guild?.id;
    const data = serverData.get(guildId);

    if (!data) {
        return interaction.reply({ content: '⚠️ انتهت جلسة هذا المقطع أو تم إيقافه.', ephemeral: true });
    }

    if (!interaction.member.voice.channel || interaction.member.voice.channel.id !== data.voiceChannel.id) {
        return interaction.reply({ content: '⚠️ يجب أن تكون داخل نفس الروم الصوتي مع البوت لاستخدام الأزرار!', ephemeral: true });
    }

    if (interaction.customId === 'btn_pause_resume') {
        if (data.isPaused) {
            data.player.unpause();
            data.isPaused = false;
            await interaction.update({ components: [getActionButtons(false, data.videoUrl)] });
        } else {
            data.player.pause();
            data.isPaused = true;
            await interaction.update({ components: [getActionButtons(true, data.videoUrl)] });
        }
    }

    if (interaction.customId === 'btn_replay') {
        await interaction.deferUpdate();
        try {
            await playAudio(guildId, data.voiceChannel, data.query, data.messageChannel, interaction.user);
        } catch (err) {
            console.error(err);
        }
    }

    if (interaction.customId === 'btn_stop') {
        if (data.ffmpegProcess) data.ffmpegProcess.kill();
        if (data.player) data.player.stop();
        if (data.connection) data.connection.destroy();
        serverData.delete(guildId);

        await interaction.update({ 
            content: `⏹️ تم إيقاف التشغيل بواسطة <@${interaction.user.id}>`, 
            components: [] 
        });
    }
});

client.login(TOKEN);