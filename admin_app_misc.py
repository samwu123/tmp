# -*- coding: utf-8 -*-
'''
db layer for admin app color trend misc.
'''
__author__ = ['yuan.wu' ]


import datetime
import binascii
import socket
import ssl
import struct
import time
import json
import logging

from Momo.base.error_code import ErrorException, ErrorCode
from Momo.base import mongo


MAX_PAYLOAD_LENGTH = 256
BUFF_SIZE = 1024
# 1: unsend, 2: sended
CHECK_TYPE_UNSENT = 1
CHECK_TYPE_SENT = 2
# this token can be used to get the error response from the APNS.
# Because if nothing wrong we can't stop reading callback,
# and it will be blocked
BAD_TOKEN = "00b6378b4ad502f624ef184befe2e0a39cc513c70de2d7902594f7bc77026f00"


class ApnException(Exception):
    pass

class PayloadTooLongException(ApnException):
    pass


def list_msg(appid, check_type=CHECK_TYPE_UNSENT, page_index=1, page_size=25):
    """ get the specified list of page content
    Args:
        appid: (string) application identity id
        check_type: (int) check type
        page_index: (int) current index
        count: (int) all record count

    Returns:
        the specified page list, and all record count
    """
    mongo_db = mongo.get_mongo()
    condition = {'appid': appid}
    sort = 'input_date'
    if check_type == 2:
        condition['send_date'] = {'$exists': True}
        sort = 'send_date'
    else:
        condition['send_date'] = {'$exists': False}
    skip = (page_index -1) * page_size
    rests = mongo_db.db[mongo.CollectionNames.PUSH_CONTENT]\
        .find(condition).limit(page_size).skip(skip)\
        .sort(sort, direction=-1)
    return [x for x in rests], rests.count()


def edit_msg(_id=None, data={}):
    """ edit the specified msg
    Args:
        _id: (string) msg id
        data: (dict) msg dict need to update
    """
    mongo_db = mongo.get_mongo()
    if _id and data:
        if mongo_db.db[mongo.CollectionNames.PUSH_CONTENT].find_one({'_id': _id, 'send_date' : {'$exists': True}}):
            raise ErrorException(ErrorCode.DATA_BAD,
                message='推送信息已经发送， 无法修改！')
        mongo_db.safe_update(
            mongo.CollectionNames.PUSH_CONTENT,
            {'_id': _id}, data)
        mongo.get_product_mongo().safe_update(
            mongo.CollectionNames.PUSH_CONTENT,
            {'_id': _id}, data)


def add_msg(data={}):
    """ add the specified msg
    Args:
        data: (dict) msg dict need to insert
    """
    if data:
        mongo_db = mongo.get_mongo()
        data['_id'] = mongo_db.generate_new_id('pushContent')
        mongo_db.db[mongo.CollectionNames.PUSH_CONTENT].insert(data)
        mongo.get_product_mongo().db[mongo.CollectionNames.PUSH_CONTENT].insert(data)


def del_msg(_id):
    """ remove the specified msg, if it's not sent
    Args:
        _id: (string) msg ID
    """
    mongo_db = mongo.get_mongo()
    mongo_db.db[mongo.CollectionNames.PUSH_CONTENT].remove({
        '_id': _id,
        'send_date': {'$exists': False}})
    mongo.get_product_mongo().db[mongo.CollectionNames.PUSH_CONTENT].remove({
        '_id': _id,
        'send_date': {'$exists': False}})


def get_msg_by_id(_id):
    mongo_db = mongo.get_mongo()
    return mongo_db.db[mongo.CollectionNames.PUSH_CONTENT].find_one({'_id': _id})


class ApnWrapper():
    cert = ""
    product = "gateway.push.apple.com"
    develop = "gateway.sandbox.push.apple.com"
    port = 2195

    def __init__(self, cert, debug=True):
        self.command = 1
        self.cert = cert
        self.debug = debug
        self.ssl_conn = ssl.wrap_socket(
            socket.socket(),
            ssl_version = ssl.PROTOCOL_SSLv3,
            certfile = self.cert)
        try:
            self.ssl_conn.connect((self.debug and self.develop or self.product, self.port))
        except Exception, e:
            raise Exception, "SSL建立连接失败(%s)" % (str(e))

    def reset_message(self, badge, alert, keys, values, extra, sound='default'):
        self.expiry = int(time.time() + 3600)
        self.badge = badge
        self.sound = sound
        self.alert = alert
        self.keys = keys
        self.values = values
        self.extra = extra
        self.payload = self._build()


    def _build(self):
        """
        Build all notifications items to one string.
        """
        # prepare key values
        msgObjToApple = {}
        msgObjToApple['aps'] = {}
        # sound
        if self.sound:
            msgObjToApple['aps']['sound'] = self.sound
        # badge
        msgObjToApple['aps']['badge'] = self.badge
        # alert
        msgObjToApple['aps']['alert'] = self.alert

        # prepare properties
        # property
        for name, value in zip(self.keys, self.values):
            msgObjToApple[name] = value
        # extra
        for key, value in self.extra.items():
            msgObjToApple[key] = value

        payload = json.dumps(msgObjToApple, ensure_ascii=False)

        # remove the space in the payload, and we use '|||||' indicates space
        # in the values
        payload = payload.replace(" ", "")
        payload = payload.replace("|||||", " ")

        payload = str(payload.encode('utf-8'))
        print payload
        if len(payload) > MAX_PAYLOAD_LENGTH:
            raise PayloadTooLongException, "Length of Payload more than %d bytes." % MAX_PAYLOAD_LENGTH
        return payload

    def get_single_message(self, deviceToken, identifier):
        payload = self.payload
        command = self.command
        expiry = self.expiry
        payloadLength = len(payload)
        tokenLength = len(deviceToken)

        # 1 4 4 2 64 2 256
        apnsPackFormat = "!BIIH" + str(tokenLength) + "sH" + str(payloadLength) + "s"

        # build notification message in binary format
        return struct.pack(apnsPackFormat,
            command,
            identifier,
            expiry,
            tokenLength,
            deviceToken,
            payloadLength,
            payload)

    def send_one_message(self, message):
        if not message:
            return
        self.ssl_conn.sendall(message)

    def read_feedback(self, base):
        result = -1
        try:
            self.ssl_conn.settimeout(5)
            recive = self.ssl_conn.read(BUFF_SIZE)
            if recive:
                _, status, identifier = struct.unpack('!BBI', recive)
                if status == 8:
                    result = identifier - base
        finally:
            self.safe_close()
        return result

    def safe_close(self):
        try:
            self.ssl_conn.close()
        except Exception, e:
            pass


class ApnWrapperFactory():
    instances = {}

    def getApnWrapper(self, cert, debug):
        wrapper = self.instances.get(cert, None)
        if not wrapper:
            wrapper = ApnWrapper(cert, debug)
            self.instances[cert] = wrapper
        return wrapper

    def destroyApnWrapper(self, wrapper):
        if wrapper:
            self.instances.pop(wrapper.cert, None)
            wrapper.safe_close()
